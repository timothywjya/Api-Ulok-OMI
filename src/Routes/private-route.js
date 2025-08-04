import { Router } from 'express';

import { authenticateToken } from '../Application/Middleware/ApiMiddleware.js';
import { RecommendationController } from '../Controller/recommendation-controller.js';
import { SurveyController } from '../Controller/survey-controller.js';
import { UserController } from '../Controller/user-controller.js';

const router = Router();

router.post('/omiho-user-data', UserController.getLoggedInUser);

router.use(authenticateToken);

router.get('/get-data-survey', SurveyController.getDataSurvey);
router.get('/get-data-detail-survey', SurveyController.getDataDetailSurveyLocation);
router.get('/get-data-recommendation-location', RecommendationController.getDataListRecommendedLocation);
router.post('/insert-data-survey', SurveyController.insertDataSurveyLocation);
// router.post('/insert-image-survey', SurveyController.insertDataSurveyLocation);

router.post('/insert-data-recommendation', RecommendationController.insertRecommendedLocation);
// router.post('/insert-image-recommendation', SurveyController.insertDataSurveyLocation);

export default router;