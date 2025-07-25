import { Router } from 'express';

import { SurveyController } from '../Controller/survey-controller.js';
import { UserController } from '../Controller/user-controller.js';
import { validateGetDataSurvey } from '../Validation/survey-validation.js';

const router = Router();


router.post('/omiho-user-data', UserController.getLoggedInUser);

router.get('/get-data-survey-lokasi', SurveyController.getDataSurveyLocation);

router.get('/get-data-survey-monitoring', validateGetDataSurvey, SurveyController.getDataSurveyMonitoring);


export default router;