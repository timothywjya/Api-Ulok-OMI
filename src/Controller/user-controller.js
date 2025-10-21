import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import { ROLE_ID_MAP } from '../Helper/constanta.js';
import NodeHashIds from '../Utils/Hashids.js';

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OMIHO_API_OAUTH_TOKEN = process.env.OMIHO_API_OAUTH_TOKEN;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export class UserController {
    static async login(req, res, next) {
        const { username, password } = req.body;

        try {
            let oAuthResponse;

            try {
                oAuthResponse = await axios.post(
                    OMIHO_API_OAUTH_TOKEN, {
                        grant_type: 'password',
                        client_id: OAUTH_CLIENT_ID,
                        client_secret: OAUTH_CLIENT_SECRET,
                        username: username,
                        password: password,
                    }, { timeout: 10000 }
                );

            } catch (oAuthError) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.body),
                    'Unauthorized',
                    502,
                    'Failed to Authenticate',
                    'Failed to get OAuth token.'
                ));
            }

            const bearerToken = oAuthResponse.data.access_token;
            if (!bearerToken) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(oAuthResponse.data),
                    'Invalid Response',
                    502,
                    'Failed to Get Token',
                    'Access token field is not found in OMIHO response.'
                ));
            }

            let omihoUserResponse;

            try {
                omihoUserResponse = await axios.post(
                    OMIHO_API_ENDPOINT_USER, {
                        client_id: OAUTH_CLIENT_ID
                    }, {
                        headers: {
                            'Authorization': `Bearer ${bearerToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
            } catch (omihoError) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ client_id: OAUTH_CLIENT_ID }),
                    'Unauthorized',
                    401,
                    'Failed to Get Data User',
                    'Failed to get user data from OMIHO API'
                ));
            }

            const userInfo = omihoUserResponse.data.data;

            if (!userInfo || !userInfo.id) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(omihoUserResponse.data),
                    'Invalid Response',
                    502,
                    'Invalid Data from OMI HO',
                    'SSO ID field is not found in OMIHO response.'
                ));
            }

            const getRole = await db('roles')
                .where('oauth_role_id', userInfo.role_id)
                .first();

            if (!getRole) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ role_id: userInfo.role_id }),
                    'Role Not Found',
                    404,
                    'Role not found in the local database',
                    'The OAuth role ID from OMIHO is not mapped to a local role.'
                ));
            }

            if (!ROLE_ID_MAP['SUPERVISOR'].includes(getRole.oauth_role_id) && getRole.oauth_role_id !== ROLE_ID_MAP['SR.CLERK']) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ role_id: userInfo.role_id }),
                    'Forbidden',
                    403,
                    'Access Denied',
                    'BDHO users are not permitted to log in.'
                ));
            }

            const userDataToSave = {
                sso_id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                employee_identification_number: userInfo.nik,
                branch_code: userInfo.branch_code,
                role_id: getRole.id,
                updated_at: new Date()
            };

            const existingUser = await db('users')
                .where('sso_id', userInfo.id)
                .first();

            let localUserId;

            if (!existingUser) {
                const insertResult = await db('users').insert({
                    ...userDataToSave,
                    created_at: new Date()
                }).returning('id');
                const newId = insertResult[0];
                localUserId = typeof newId === 'object' ? newId.id : newId;
            } else {
                await db('users')
                    .where('sso_id', userInfo.id)
                    .update(userDataToSave);

                localUserId = existingUser.id;
            }

            const userFromLocalDb = await db('users')
                .select(
                    'users.id',
                    'users.name as user_name',
                    'users.employee_identification_number as nik',
                    'users.email as email',
                    'master_branches.branch_code as branch_code',
                    'master_branches.branch_name as branch_name',
                    'roles.name as role_name',
                    'roles.oauth_role_id as role_id'
                )
                .where('users.id', localUserId)
                .join('roles', 'roles.id', '=', 'users.role_id')
                .join('master_branches', 'master_branches.branch_code', '=', 'users.branch_code')
                .first();

            if (!userFromLocalDb) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ user_id: localUserId }),
                    'User Not Found',
                    404,
                    'Data User is not Found after insertion',
                    'Failed to retrieve user data after upsert operation.'
                ));
            }

            // 4. JWT GENERATION & RESPONSE
            const payload = {
                userIds: NodeHashIds.encode(userFromLocalDb.id, USER_SECRET_KEY),
                name: userFromLocalDb.user_name,
                email: userFromLocalDb.email,
                role: userFromLocalDb.role_name,
                role_ids: userFromLocalDb.role_id,
                branch_code: userFromLocalDb.branch_code,
            };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            const formattedUserData = {
                ids: payload.userIds,
                role_ids: payload.role_ids,
                name: payload.name,
                nik: userFromLocalDb.nik,
                email: payload.email,
                branch_code: payload.branch_code,
                branch_name: userFromLocalDb.branch_name,
                role_name: payload.role,
            };

            let expiresInSeconds = 0;
            if (JWT_EXPIRES_IN.endsWith('d')) {
                const days = parseInt(JWT_EXPIRES_IN.slice(0, -1));
                expiresInSeconds = days * 24 * 60 * 60;
            } else if (JWT_EXPIRES_IN.endsWith('h')) {
                const hours = parseInt(JWT_EXPIRES_IN.slice(0, -1));
                expiresInSeconds = hours * 60 * 60;
            } else if (JWT_EXPIRES_IN.endsWith('m')) {
                const minutes = parseInt(JWT_EXPIRES_IN.slice(0, -1));
                expiresInSeconds = minutes * 60;
            } else {
                expiresInSeconds = 60 * 60;
            }
            const expirationTimestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;

            return res.status(200).json({
                status_code: 200,
                status: 'success',
                message: 'Login successful.',
                data: formattedUserData,
                token: token,
                expired_at: expirationTimestamp,
            });

        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.body || {}),
                'Internal Server Error',
                500,
                'Oops, something went wrong',
                error.message || 'Unknown error in Login process.'
            ));
        }
    }
}

export default { UserController };