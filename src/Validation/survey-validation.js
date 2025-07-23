import { query, validationResult } from 'express-validator';

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        const validationError = new Error(firstError.msg);
        validationError.statusCode = 400;
        validationError.details = errors.array();
        return next(validationError);
    }
    next();
};

const validateGetDataSurvey = [
    query('implementedById')
    .notEmpty().withMessage('Query parameter "implementedById" tidak boleh kosong.')
    .isInt({ min: 1 }).withMessage('Query parameter "implementedById" harus berupa angka bulat positif.'),

    query('surveyTypeId')
    .optional()
    .isInt({ min: 1 }).withMessage('Query parameter "surveyTypeId" harus berupa angka bulat positif jika disediakan.'),

    handleValidationErrors
];

export { validateGetDataSurvey };