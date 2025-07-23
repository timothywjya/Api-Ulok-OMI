// src/Application/Middleware/ApiMiddleware.js

import dotenv from 'dotenv';
import winston from 'winston';
import ApiError from '../../Error/api-error.js';
import { ssoTokenValidationService } from '../../service/sso-token-validation-service.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not defined in .env. This is only critical if you generate local API JWTs.');
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

export const ApiMiddleware = async(req, res, next) => {
    let ssoAccessToken;

    // --- HARDCODE TOKEN UNTUK DEVELOPMENT / DEBUGGING SAJA ---
    if (process.env.NODE_ENV === 'development') {
        const HARDCODED_SSO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMyIsImp0aSI6IjVmZDBlY2MzZTE1NTI2ZjEwODQzOTViMjgzODExYzQxNmE4YjA3NGViMWViYjcxNjNjMTI0M2JiN2UwYmMwMDJjYzc1Mzk5MzExZTI5ZDEyIiwiaWF0IjoxNzUyNzI1ODY0LjMyMDkxNCwibmJmIjoxNzUyNzI1ODY0LjMyMDkyMywiZXhwIjoxNzU0MDIxODY0LjMxMjc5LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.kLyTrqqheI7pCZwdKhF17UvqOCk_M1ZiKbrzLBCBymjV5RbV9Ul5hX8nYUkhO__WxsuSzKhpX75Fy6cxwVi2pJ0XyZnKowNFfksX_6HJp5UvNHWhAiHpEk2ElNB-9sF9dq0BXsUigdJTPyfLUNo85HXf4BL7mo4yr52KGBSxj2-re5JzdUyvrysJbziZ43DlrhSo48yFnVq4r4ybjCjDarIXQjykt-3LJDenSzYFprEIAxqvv87pZ1MvcJyiR0LhP26MOqaGLWZ8yejPSPTbQjQi4eIkTuN341JFuIWQNY7_hzPEwBOtUQrYzLv_SHNZ2L8pvUruwemeqb8-WRwOmny8wJ9CleHxyyZDGUdNKFiAjy_0GvssIt-M0dbXl0COkJ4ws7DZVCGeEBPL2R19yl5DaJgClcj4w7sEzq4U7gwX32Aq1UQa1wMSu79i3jzU4CM5ezscoIcM4iERBnNoSnHOU8BL4GwfGXjsZrroT72_XEX2lrya5TOJBZ3ybqRWuzSeVQwrqvKrQwUtsujv9R2l475OBjhYuBYRauGGObWglEBP9c_5aiPxYbw2GGCaZEjXzm8TzqdGvTDm5BhXizXqnWHqQbmpD-b9-YBF2RARTkCHIjoWEJTjAvMudDxT9GkjeRlV5-hhVN3Imoxvyq7-sPB92O3DUEbrmEgKL0";
        ssoAccessToken = HARDCODED_SSO_TOKEN;
        logger.warn('WARNING: Using hardcoded SSO Access Token for development mode!');
    } else {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Unauthorized access attempt: No valid Authorization header or malformed.');
            return next(new ApiError(401, 'Akses ditolak. Token otentikasi tidak ditemukan atau tidak valid.'));
        }
        ssoAccessToken = authHeader.split(' ')[1];
    }
    // --- AKHIR HARDCODE TOKEN ---

    if (!ssoAccessToken) {
        logger.warn('Unauthorized access attempt: Token extraction failed (after hardcode check).');
        return next(new ApiError(401, 'Akses ditolak. Token tidak ditemukan atau format tidak valid.'));
    }

    try {
        // Validasi SSO Access Token menggunakan ssoTokenValidationService (ini akan memverifikasi JWT lokal).
        const ssoUserPayload = await ssoTokenValidationService.validateSsoToken(ssoAccessToken);

        if (!ssoUserPayload) {
            logger.warn('Unauthorized access attempt: SSO Access Token is invalid or inactive after validation.');
            // Ini bisa terjadi jika validasi JWT berhasil tapi payload kosong atau tidak lengkap
            return next(new ApiError(401, 'Token otentikasi SSO valid tetapi tidak mengandung informasi pengguna yang cukup.'));
        }

        // Simpan informasi pengguna yang sudah divalidasi dari SSO ke req.ssoUser
        req.ssoUser = {
            ...ssoUserPayload,
            ssoAccessToken: ssoAccessToken // Simpan token asli juga jika diperlukan
        };

        logger.info(`API access granted for user: ${req.ssoUser.name} (NIK: ${req.ssoUser.nik || 'N/A'}, Role ID: ${req.ssoUser.role_id || 'N/A'}) via SSO Token.`);
        next();

    } catch (error) {
        logger.error(`API Middleware error during SSO JWT validation: ${error.message}`, error);
        // Tangkap jenis error spesifik dari jsonwebtoken/jwks-rsa
        if (error.name === 'TokenExpiredError') {
            return next(new ApiError(401, 'Token otentikasi SSO kedaluwarsa.', error.message));
        } else if (error.name === 'JsonWebTokenError') {
            return next(new ApiError(401, `Token otentikasi SSO tidak valid: ${error.message}`, error.message));
        } else if (error.name === 'NotBeforeError') {
            return next(new ApiError(401, 'Token otentikasi SSO belum aktif.', error.message));
        }
        // General error for any other unexpected issues during validation
        return next(new ApiError(500, 'Terjadi kesalahan server saat memverifikasi token otentikasi.', error.message));
    }
};