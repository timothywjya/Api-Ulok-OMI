import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fileUpload from 'express-fileupload';
import helmet from 'helmet';
import knex from 'knex';
import morgan from 'morgan';
import winston from 'winston';
import knexConfig from '../knexfile.js';

import ApiError from '../src/Error/api-error.js';
import errorHandler from '../src/Error/error-handling.js';
import privateRoutes from '../src/Routes/private-route.js';
import publicRoutes from '../src/Routes/public-route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

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

app.use('/images', express.static('images'));

app.use((req, res, next) => {
    req.logger = logger;
    req.db = db;
    next();
});

app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use('/', publicRoutes);
app.use('/api', privateRoutes);
app.use('*', (req, res, next) => {
    req.logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    next(new ApiError(404, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);
app.listen(PORT, () => {
    logger.info(`Server berjalan di http://127.0.0.1:${PORT} pada mode ${process.env.NODE_ENV}`);
});