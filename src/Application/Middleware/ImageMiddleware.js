import dotenv from 'dotenv';
import { CustomError } from '../../Error/error-handling.js';
dotenv.config();

const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;

export const validateImageKey = (req, res, next) => {

    const providedKey = req.headers['authorization'];

    if (!providedKey) {
        return next(new CustomError(
            req.originalUrl,
            JSON.stringify(req.headers || {}),
            'Authorization Error',
            401,
            'Unauthorized',
            'Authorization key is missing.'
        ));
    }

    if (providedKey !== IMAGE_SECRET_KEY) {
        return next(new CustomError(
            req.originalUrl,
            JSON.stringify(req.headers || {}),
            'Authorization Error',
            401,
            'Unauthorized',
            'Invalid authorization key.'
        ));
    }

    next();
};