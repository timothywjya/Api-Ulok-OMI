// src/Middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { CustomError } from '../Error/error-handling.js'; // Pastikan path benar

const JWT_SECRET = process.env.JWT_SECRET; // Pastikan ini diakses dengan benar

export const authenticateToken = (req, res, next) => {
    // Ambil token dari header Authorization (biasanya format: Bearer TOKEN_ANDA)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Ambil bagian TOKEN_ANDA

    if (!token) {
        // Jika tidak ada token, kembalikan 401 Unauthorized
        return next(new CustomError(
            'Authentication Failed',
            401,
            'Unauthorized',
            'Access token is missing. Please log in.'
        ));
    }

    // Verifikasi token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Jika token tidak valid atau kadaluarsa, kembalikan 403 Forbidden
            // (Kadaluarsa juga menghasilkan error, jadi ini akan menangkapnya)
            console.error('JWT Verification Error:', err.message);
            return next(new CustomError(
                'Invalid or Expired Token',
                403,
                'Forbidden',
                'Your access token is invalid or has expired. Please log in again.'
            ));
        }
        // Jika token valid, simpan informasi user dari payload token di objek request
        req.user = user; // Sekarang Anda bisa mengakses req.user.id, req.user.role_name, dll. di rute berikutnya
        next(); // Lanjutkan ke handler rute berikutnya
    });
};