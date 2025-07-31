import { Router } from 'express';

import { authenticateToken } from '../Application/Middleware/ApiMiddleware.js';
import { SurveyController } from '../Controller/survey-controller.js';
import { UserController } from '../Controller/user-controller.js';

const router = Router();

router.post('/omiho-user-data', UserController.getLoggedInUser);

router.use(authenticateToken);
router.get('/get-data-survey-location', SurveyController.getDataSurveyLocation);
router.get('/get-detail-survey-location', SurveyController.getDataDetailSurveyLocation);
// router.get('/get-data-answered-survey-location', SurveyController.getDataAnsweredSurveyLocation);
// router.get('/get-detail-answered-survey-location', SurveyController.getDataDetailAnsweredSurveyLocation);
router.get('/get-data-survey-monitoring', SurveyController.getDataSurveyMonitoring);
router.get('/get-detail-survey-monitoring', SurveyController.getDataDetailSurveyMonitoring);
// router.get('/get-data-answered-survey-monitoring', SurveyController.getDataAnsweredSurveyMonitoring);
// router.get('/get-detail-answered-survey-monitoring', SurveyController.getDataDetailAnsweredSurveyMonitoring);

// router.post('/insert-data-survey-location', SurveyController.getDataDetailSurveyMonitoring);
// router.post('/insert-image-survey-location', SurveyController.getDataDetailSurveyMonitoring);
// router.post('/insert-data-survey-monitoring', SurveyController.getDataDetailSurveyMonitoring);
// router.post('/insert-image-survey-monitoring', SurveyController.getDataDetailSurveyMonitoring);

export default router;