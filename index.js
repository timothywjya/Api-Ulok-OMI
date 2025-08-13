import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import knex from 'knex';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import knexConfig from './knexfile.js';
import ApiError from './src/Error/api-error.js';

import privateRoutes from './src/Routes/private-route.js';
import publicRoutes from './src/Routes/public-route.js';

import errorHandler from './src/Error/error-handling.js';

dotenv.config();

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

const db = knex(knexConfig.development);

db.raw('SELECT 1')
    .then(() => {
        logger.info('Database connection successful');
    })
    .catch(err => {
        logger.error('Failed to connect to the database:', err);
        process.exit(1);
    });

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.logger = logger;
    next();
});

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

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
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        statusCode: 429,
        message: 'Too much of Request, Please Try Again in 5 Minutes',
    }
});

app.use('/images', express.static(path.join(__dirname, 'images')));

console.log('Serving static files from:', path.join(__dirname, 'images'));

app.use('/api', apiLimiter, privateRoutes);
app.use('/', publicLimiter, publicRoutes);

app.use('*', (req, res, next) => {
    req.logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    next(new ApiError(404, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Server berjalan di http://127.0.0.1:${PORT} pada mode ${process.env.NODE_ENV}`);
});