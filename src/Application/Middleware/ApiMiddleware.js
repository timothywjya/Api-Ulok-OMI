import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { CustomError } from '../../Error/error-handling.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(new CustomError(
            req.originalUrl,
            JSON.stringify(req.headers || {}),
            'Authentication Failed',
            401,
            'Unauthorized',
            'Access token is missing. Please log in.'
        ));
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Invalid or Expired Token',
                403,
                'Forbidden',
                'Your access token is invalid or has expired. Please log in again.'
            ));
        }

        req.user = user;
        next();
    });
};