import axios from 'axios';
import dotenv from 'dotenv';
import ApiError from '../Error/api-error.js';

dotenv.config();

const OMIHO_API_ENDPOINT_USER = process.env.OMIHO_API_BASE_URL;
const OMIHO_PROXY_BEARER_TOKEN = process.env.OMIHO_PROXY_BEARER_TOKEN; // <--- This is the constant
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;

export const getLoggedInUser = async (req, res, next) => {
    const logger = req.logger;

    try {
        if (!OAUTH_CLIENT_ID) {
            logger.error('getLoggedInUser: OAUTH_CLIENT_ID tidak ditemukan di environment variables.');
            return next(new ApiError(500, 'Konfigurasi server tidak lengkap: OAUTH_CLIENT_ID tidak ditemukan.'));
        }

        // The problematic line is likely within this block, specifically if you tried to assign to OMIHO_PROXY_BEARER_TOKEN
        if (!OMIHO_PROXY_BEARER_TOKEN || OMIHO_PROXY_BEARER_TOKEN === "asidugasgeiy89e928euiwudius6e7qwhhjdqw87dy273") {
            // This condition is checking its value, but not reassigning it.
            // So the error must be on line 15.
            logger.warn('getLoggedInUser: OMIHO_PROXY_BEARER_TOKEN tidak ditemukan atau masih default.');
            return next(new ApiError(500, 'Konfigurasi server tidak lengkap: OMIHO_PROXY_BEARER_TOKEN tidak valid.'));
        }

        logger.info(`getLoggedInUser: Menggunakan Client_ID dari ENV: ${OAUTH_CLIENT_ID}`);

        const requestBodyToOmiho = {
            Client_ID: OAUTH_CLIENT_ID
        };

        let omihoResponse;
        try {
            omihoResponse = await axios.post(OMIHO_API_ENDPOINT_USER, requestBodyToOmiho, {
                headers: {
                    'Authorization': `Bearer ${OMIHO_PROXY_BEARER_TOKEN}`, // Used here, which is fine
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
        } catch (axiosError) {
            // ... (error handling) ...
        }

        const userInfo = omihoResponse.data.user;

        if (!userInfo) {
            logger.error('getLoggedInUser: API OMIHO tidak mengembalikan data pengguna yang diharapkan:', omihoResponse.data);
            return next(new ApiError(404, 'Informasi pengguna tidak ditemukan dalam respons API OMIHO.'));
        }

        logger.info(`getLoggedInUser: Berhasil mengambil info pengguna untuk: ${userInfo.name || 'N/A'} (ID: ${userInfo.id || 'N/A'}).`);

        res.status(200).json({
            status: 'success',
            message: 'Informasi pengguna yang login berhasil diambil.',
            data: userInfo
        });

    } catch (error) {
        logger.error('getLoggedInUser: Terjadi kesalahan tak terduga saat mengambil info pengguna:', error);
        next(new ApiError(500, 'Terjadi kesalahan internal saat mengambil informasi pengguna yang login.', error.message));
    }
};