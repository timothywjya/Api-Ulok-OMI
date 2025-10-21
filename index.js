import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import knex from 'knex';
import morgan from 'morgan';
import knexConfig from './knexfile.js';
import ApiError from './src/Error/api-error.js';

import privateRoutes from './src/Routes/private-route.js';
import publicRoutes from './src/Routes/public-route.js';

import errorHandler from './src/Error/error-handling.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const db = knex(knexConfig.development);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(morgan('dev'));

db.raw('SELECT 1')
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    });

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        statusCode: 429,
        message: 'Too much of Request, Please Try Again in 15 Minutes',
    }
});

const publicLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        statusCode: 429,
        message: 'Too much of Request, Please Try Again in 5 Minutes',
    }
});

app.use('/api', apiLimiter, privateRoutes);
app.use('/', publicLimiter, publicRoutes);

app.use('*', (req, res, next) => {
    next(new ApiError(404, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server berjalan di http://127.0.0.1:${PORT}`);
});