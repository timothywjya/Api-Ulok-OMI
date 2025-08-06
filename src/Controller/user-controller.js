import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export class UserController {
    static async getLoggedInUser(req, res, next) {
        const bearerToken = req.body.bearer_token;

        try {
            if (!bearerToken) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.body || {}),
                    'Bad Request',
                    400,
                    'Authentication Required',
                    'Bearer token must be provided in the request body.'
                ));
            }

            let omihoResponse;

            try {
                omihoResponse = await axios.post(OMIHO_API_ENDPOINT_USER, {
                    client_id: OAUTH_CLIENT_ID
                }, {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            } catch (omihoError) {
                const errData = omihoError.response && omihoError.response.data ? omihoError.response.data : {};
                const errMsg = errData.message ? errData.message : 'Failed to Call OMIHO API.';
                const errCode = omihoError.response && omihoError.response.status ? omihoError.response.status : 401;

                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ client_id: OAUTH_CLIENT_ID }),
                    'Unauthorized',
                    errCode,
                    'Failed to Get Data User',
                    errMsg
                ));
            }

            const userInfo = omihoResponse.data.data;

            if (!userInfo || !userInfo.id) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(omihoResponse.data),
                    'Invalid Response',
                    502,
                    'A Data from OMI HO is not Valid',
                    'SSO ID Field is Not Found in response OMIHO.'
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
                    'Role is Not Found',
                    'Role OAuth in OMIHO is not Found in Survey Lokasi OMI'
                ));
            }

            // if (userInfo == "b51fac8f3a") { // Checking by Constanta
            //     // Setting selain SPV dan Clerk dilarang masuk
            //     return next(new CustomError(
            //         req.originalUrl,
            //         JSON.stringify(req.body || {}),
            //         'Internal Server Error',
            //         500,
            //         'Oops Something Wrong',
            //         error.message || 'Unknown error in getLoggedInUser'
            //     ));
            // }

            const existingUser = await db('users')
                .where('sso_id', userInfo.id)
                .first();

            const userDataToSave = {
                sso_id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                employee_identification_number: userInfo.nik,
                branch_code: userInfo.branch_code,
                role_id: getRole.id,
                updated_at: new Date()
            };

            let localUserId;

            if (!existingUser) {
                const [newId] = await db('users').insert({
                    ...userDataToSave,
                    created_at: new Date()
                }).returning('id');

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
                .join('roles', 'roles.id', '=', 'users.role_id')
                .join('master_branches', 'master_branches.branch_code', '=', 'users.branch_code')
                .where('users.id', localUserId)
                .first();

            if (!userFromLocalDb) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ user_id: localUserId }),
                    'User Not Found',
                    404,
                    'Data User is not Found after insert Data',
                    'Failed to Get Data after Insert Data User'
                ));
            }

            const formattedUserData = {
                ids: NodeHashIds.encode(userFromLocalDb.id, USER_SECRET_KEY),
                role_ids: userFromLocalDb.role_id,
                name: userFromLocalDb.user_name,
                nik: userFromLocalDb.nik,
                email: userFromLocalDb.email,
                branch_code: userFromLocalDb.branch_code,
                branch_name: userFromLocalDb.branch_name,
                role_name: userFromLocalDb.role_name
            };

            const payload = {
                userIds: NodeHashIds.encode(userFromLocalDb.id, USER_SECRET_KEY),
                name: userFromLocalDb.user_name,
                email: userFromLocalDb.email,
                role: userFromLocalDb.role_name,
                role_ids: userFromLocalDb.role_id,
                branch_code: userFromLocalDb.branch_code,
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            // Expired_at
            return res.status(200).json({
                status_code: 200,
                status: 'success',
                message: 'Get Data User Successfully',
                data: formattedUserData,
                token: token
            });

        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.body || {}),
                'Internal Server Error',
                500,
                'Oops Something Wrong',
                error.message || 'Unknown error in getLoggedInUser'
            ));
        }
    }
}


export class UserPublicController {
    static async getPublicDataUser(req, res, next) {
        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;

        try {
            const query = await db("users")
                .select(
                    'users.id',
                    'users.name',
                    'users.email',
                    'users.employee_identification_number as nik',
                    'branch_code',
                    'role_id'
                );

            const data = query.map(item => {
                const {
                    id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(id, USER_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Sucessfully',
                data: data
            });
        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Survey Location',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    };
}

export default { UserController, UserPublicController };