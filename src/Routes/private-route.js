import { Router } from 'express';

import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../Application/Middleware/ApiMiddleware.js';
import { recommendedLocationMiddleware } from '../Application/Middleware/InsertDataMiddleware.js';
import { ImageController } from '../Controller/image-controller.js';
import { RecommendationController } from '../Controller/recommendation-controller.js';
import { SurveyController } from '../Controller/survey-controller.js';
import { UserController } from '../Controller/user-controller.js';
import { recommendedLocationValidation } from '../Validation/insert-validation.js.js';

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too much Login Attempt, Please Try Again in 5 Minutes",
    },
});

router.post('/login', loginLimiter, UserController.login);

router.use(authenticateToken);

router.get('/get-data-survey', SurveyController.getDataSurvey);
router.get('/get-data-history-survey', SurveyController.getDataHistorySurvey);
router.get('/get-data-recommendation-location', RecommendationController.getDataListRecommendedLocation);
router.post('/insert-data-survey', SurveyController.insertDataSurveyLocation);

router.post('/insert-data-recommendation', recommendedLocationMiddleware(recommendedLocationValidation), RecommendationController.insertRecommendedLocation);

router.post('/insert-image-survey', ImageController.uploadImages);

export default router;