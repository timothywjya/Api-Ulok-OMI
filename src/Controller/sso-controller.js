// src/controllers/ssoController.js

import winston from 'winston'; // Untuk logging internal controller jika diperlukan
import ApiError from '../Error/api-error.js';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

/**
 * @function getInfoUserSSO
 * @description Mengambil informasi pengguna yang sudah terotentikasi melalui SSO dari req.ssoUser.
 * Fungsi ini dipanggil setelah ApiMiddleware berhasil memvalidasi token SSO.
 * @param {object} req - Objek request Express.js, diharapkan memiliki req.ssoUser
 * @param {object} res - Objek response Express.js
 * @param {function} next - Middleware next function
 */
export const getInfoUserSSO = async (req, res, next) => {
    try {
        const userInfo = req.ssoUser;
        console.log(req.ssoUser);
        if (!userInfo) {
            logger.warn('getInfoUserSSO: req.ssoUser not found, indicating a middleware issue or unauthenticated access.');
            return next(new ApiError(401, 'Informasi pengguna SSO tidak tersedia. Akses tidak terotentikasi atau ada masalah server.'));
        }

        res.status(200).json({
            status: 'success',
            message: 'Informasi pengguna SSO berhasil diambil.',
            data: userInfo
        });

    } catch (error) {
        logger.error('Error in getInfoUserSSO:', error);
        next(new ApiError(500, 'Gagal mengambil informasi pengguna SSO.', error.message));
    }
};