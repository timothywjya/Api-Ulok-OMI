class ApiError extends Error {
    constructor(statusCode, message, errorMessage = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorMessage = errorMessage;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;