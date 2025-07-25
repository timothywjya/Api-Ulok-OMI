import axios from 'axios';
import dotenv from 'dotenv';
import { CustomError } from '../Error/error-handling.js';

dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
const OMIHO_PROXY_BEARER_TOKEN = process.env.OMIHO_PROXY_BEARER_TOKEN;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;

export const getLoggedInUser = async (req, res, next) => {
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