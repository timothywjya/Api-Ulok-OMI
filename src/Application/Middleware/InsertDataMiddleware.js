import { CustomError } from "../../Error/error-handling.js";

export const recommendedLocationMiddleware = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);

        return next(new CustomError(
            req.originalUrl,
            JSON.stringify(req.headers || {}),
            'Validation Error',
            400,
            errorMessages.join('; '),
            errorMessages.join('; ')
        ));
    }

    next();
};