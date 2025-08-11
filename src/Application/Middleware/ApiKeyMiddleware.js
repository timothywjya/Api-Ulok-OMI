import ApiError from '../../Error/api-error.js';

const API_KEY = process.env.APP_KEY;

const apiKeyMiddleware = (req, res, next) => {
    const providedApiKey = req.header('x-api-key');

    if (!providedApiKey || providedApiKey !== API_KEY) {
        return next(new ApiError(401, 'Invalid API Key'));
    }

    next();
};

export default apiKeyMiddleware;