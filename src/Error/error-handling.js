import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import NodeHashIds from '../Utils/Hashids.js';

dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

export class CustomError extends Error {
    constructor(url, params, status, code, message, errorMessage) {
        super(message);
        this.url = url;
        this.params = params;
        this.status = status;
        this.code = code;
        this.error = errorMessage;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = async (err, req, res, next) => {
    const isCustomError = err instanceof CustomError;

    const statusCode = isCustomError && typeof err.code === 'number' ? err.code : 500;
    const statusMessage = isCustomError && typeof err.status === 'string' ? err.status : 'Error';
    const clientMessage = isCustomError && typeof err.message === 'string' ? err.message : 'Terjadi kesalahan pada server.';
    const errorMessage = isCustomError && typeof err.error === 'string' ? err.error : (err.message || 'Unknown server error.');

    const logData = {
        log_url: req.originalUrl ? req.originalUrl : (req.body && req.body.url ? req.body.url : 'Unknown URL'),
        log_status_code: statusCode,
        log_parameters: req.body ? JSON.stringify(req.body) : '{}',
        log_status: statusMessage,
        log_message: clientMessage,
        log_error_message: errorMessage,
        log_created_at: db.fn.now(),
        log_created_by: NodeHashIds.decode(req.user.userIds, process.env.USER_SECRET_KEY) || '1'
    };

    try {
        await db('logs').insert(logData);

    } catch (dbError) {

    }

    if (process.env.NODE_ENV.toUpperCase() == "PRODUCTION") {
        errorMessage = "Server Error"
    }

    res.status(statusCode).json({
        status: statusMessage,
        status_code: String(statusCode),
        message: clientMessage,
        error_message: errorMessage,
    });
};

export default errorHandler;