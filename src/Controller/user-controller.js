import axios from 'axios';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js'; // Pastikan path ini benar dan NodeHashIds diekspor dengan benar

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
// const OMIHO_PROXY_BEARER_TOKEN = process.env.OMIHO_PROXY_BEARER_TOKEN; 
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;

export class UserController {
    static async getLoggedInUser(req, res, next) {
        const bearerToken = req.body.bearerToken;

        try {
            const requestBodyToOmiho = {
                client_id: OAUTH_CLIENT_ID
            };

            const omihoResponse = await axios.post(OMIHO_API_ENDPOINT_USER, requestBodyToOmiho, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const userInfo = omihoResponse.data.data;

            const existingUser = await db('users')
                .where('sso_id', userInfo.id)
                .first();

            const getRole = await db('roles')
                .where('oauth_role_id', userInfo.role_id)
                .first();

            // if (!getRole) {
            //     return next(new CustomError(
            //         'Role Configuration Error',
            //         500,
            //         'Internal Server Error',
            //         `User role '${userInfo.role_id}' from OMIHO is not configured in the local system. Please update role mappings.`
            //     ));
            // }

            // if (getRole.name !== "Sr. Clerk" && getRole.name !== "Supervisor") {
            //     // return next(new CustomError(
            //     //     'Unauthorized Access',
            //     //     403,
            //     //     'Access Denied',
            //     //     `Your role ('${getRole.name}') is not authorized to log in.`
            //     // ));
            // }

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
                localUserId = newId;
                console.log(1);
            } else {
                await db('users')
                    .where('sso_id', userInfo.id)
                    .update({
                        name: userInfo.name,
                        email: userInfo.email,
                        employee_identification_number: userInfo.nik,
                        branch_code: userInfo.branch_code,
                        role_id: getRole.id,
                        updated_at: new Date()
                    });
                localUserId = existingUser.id;
            }

            const userFromLocalDb = await db('users')
                .select(
                    'users.id',
                    'users.name as user_name',
                    'users.employee_identification_number as nik',
                    'users.email as email',
                    db.raw("CONCAT(master_branches.branch_code, ' - ', master_branches.branch_name) AS branch_name"),
                    'roles.name as role_name'
                )
                .join('roles', 'roles.id', '=', 'users.role_id')
                .join('master_branches', 'master_branches.branch_code', '=', 'users.branch_code')
                .where('users.id', localUserId)
                .first();

            const formattedUserData = {
                ids: NodeHashIds.encode(userFromLocalDb.id, USER_SECRET_KEY),
                name: userFromLocalDb.user_name,
                nik: userFromLocalDb.nik,
                email: userFromLocalDb.email,
                branch_name: userFromLocalDb.branch_name,
                role_name: userFromLocalDb.role_name
            };

            res.status(200).json({
                status_code: 200,
                status: 'success',
                message: 'Get Data User Successfully',
                data: formattedUserData
            });

        } catch (error) {

        }
    };
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