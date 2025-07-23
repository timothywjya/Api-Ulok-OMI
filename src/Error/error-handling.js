import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';

dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV]);

export class CustomError extends Error {
    constructor(message, statusCode, status, errorMessage, customParams = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.status = status;
        this.error_message = errorMessage;
        this.customParams = customParams;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = async (err, req, res, next) => {
    const isCustomError = err instanceof CustomError;

    const statusCode = isCustomError && typeof err.statusCode === 'number' ? err.statusCode : 500;
    const statusMessage = isCustomError && typeof err.status === 'string' ? err.status : 'Error';
    const clientMessage = isCustomError && typeof err.message === 'string' ? err.message : 'Terjadi kesalahan pada server.';
    const errorMessage = isCustomError && typeof err.error_message === 'string' ? err.error_message : (err.message || 'Unknown server error.');
    const customParams = isCustomError && err.customParams !== undefined ? err.customParams : null;

    console.error('--- Server Error Caught by errorHandler ---');
    console.error('Error Type:', isCustomError ? 'CustomError' : 'Standard Error');
    console.error('Message:', err.message);
    console.error('Error Details:', err);
    if (err.stack) {
        console.error('Stack Trace:', err.stack);
    }
    console.error('------------------------------------------');

    const logData = {
        url_parameters: JSON.stringify(req.query || {}),
        request_body: req.body ? JSON.stringify(req.body) : null,
        status: statusMessage,
        status_code: String(statusCode),
        message: clientMessage,
        error_message: errorMessage,
        custom_parameters: customParams ? JSON.stringify(customParams) : null,
        created_at: db.fn.now(),
    };

    try {
        await db('logs').insert(logData);
        console.log('Error logged to database successfully.');
    } catch (dbError) {
        console.error('Failed to log error to database:', dbError);
    }

    res.status(statusCode).json({
        status: statusMessage,
        status_code: String(statusCode),
        message: clientMessage,
        error_message: errorMessage,
    });
};

export default errorHandler;