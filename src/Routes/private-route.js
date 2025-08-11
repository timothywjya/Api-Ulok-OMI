import { Router } from 'express';

import { authenticateToken } from '../Application/Middleware/ApiMiddleware.js';
import { recommendedLocationMiddleware } from '../Application/Middleware/InsertDataMiddleware.js';
import { ImageController } from '../Controller/image-controller.js';
import { RecommendationController } from '../Controller/recommendation-controller.js';
import { SurveyController } from '../Controller/survey-controller.js';
import { UserController } from '../Controller/user-controller.js';
import { recommendedLocationValidation } from '../Validation/insert-validation.js.js';

const router = Router();

router.post('/omiho-user-data', UserController.getLoggedInUser);

router.use(authenticateToken);

router.get('/get-data-survey', SurveyController.getDataSurvey);
router.get('/get-data-history-survey', SurveyController.getDataHistorySurvey);
router.get('/get-data-recommendation-location', RecommendationController.getDataListRecommendedLocation);
router.post('/insert-data-survey', SurveyController.insertDataSurveyLocation);

router.post('/insert-data-recommendation', recommendedLocationMiddleware(recommendedLocationValidation), RecommendationController.insertRecommendedLocation);

router.post('/insert-image-survey', ImageController.uploadImages);

export default router;