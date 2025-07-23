import winston from 'winston';
import db from '../Config/db.js';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

class LogService {
    constructor() {
        this.tableName = 'logs';
    }

    /**
     * Menyimpan log ke Database
     * @param {object} logData - Objek yang berisi data untuk disimpan.
     * @param {string} logData.log_url - URL permintaan.
     * @param {string} logData.log_parameters - Parameter permintaan (query/body/params).
     * @param {string} logData.log_status - Status log (e.g., 'SUCCESS', 'FAILED', 'ERROR').
     * @param {number} logData.log_status_code - HTTP status code.
     * @param {string} logData.log_message - Pesan log user-friendly.
     * @param {string} [logData.log_error_message] - Pesan error detail (stack trace/exception).
     * @param {string} [logData.log_created_by] - User yang membuat log (misal ID user).
     */
    async saveLog(logData) {
        try {
            const dataToInsert = {
                log_url: logData.log_url,
                log_parameters: logData.log_parameters ? JSON.stringify(logData.log_parameters) : null,
                log_status: logData.log_status,
                log_status_code: logData.log_status_code,
                log_message: logData.log_message,
                log_error_message: logData.log_error_message || null,
                log_created_by: logData.log_created_by || 'SYSTEM',
                log_created_at: new Date(),
                log_updated_at: new Date()
            };

            await db(this.tableName).insert(dataToInsert);
            logger.info('Log entry saved to database successfully.');

        } catch (dbError) {
            logger.error('Failed to save log to database:', dbError);
        }
    }
}

export const logService = new LogService();