import axios from 'axios';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
const OMIHO_PROXY_BEARER_TOKEN = process.env.OMIHO_PROXY_BEARER_TOKEN;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;

export class UserController {
    static async getLoggedInUser(req, res, next) {
        const logger = req.logger;
        // const bearerToken = req.bearerToken;
        const bearerToken = process.env.OMIHO_PROXY_BEARER_TOKEN;

        try {
            let omihoResponse;

            const requestBodyToOmiho = {
                client_id: OAUTH_CLIENT_ID
            };

            omihoResponse = await axios.post(OMIHO_API_ENDPOINT_USER, requestBodyToOmiho, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const userInfo = omihoResponse.data.data;

            if (!userInfo || userInfo.role_id == 'b51fac8f3a') {
                return next(new CustomError(
                    'Failed to connect SSO OMI.',
                    404,
                    'Error',
                    'User Data is not Found.'
                ));
            }

            const existingUser = await db('users')
                .where('sso_id', userInfo.id)
                .andWhere('employee_identification_number', userInfo.nik)
                .andWhere('email', userInfo.email)
                .andWhere('branch_code', userInfo.branch_code,)
                .andWhere('role_id', userInfo.role_id)
                .first();

            const userDataToSave = {
                sso_id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                employee_identification_number: userInfo.nik,
                branch_code: userInfo.branch_code,
                role_id: userInfo.role_id,
                updated_at: new Date()
            };

            if (!existingUser) {
                await db('users').insert({
                    ...userDataToSave,
                    created_at: new Date()
                });
            }

            res.status(200).json({
                status_code: 200,
                status: 'success',
                message: 'Get Info Login Successfully',
                data: userInfo
            });

        } catch (error) {
            return next(new CustomError(
                'Failed to Connect SSO-OMIHO',
                404,
                'Error',
                error.message
            ));
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