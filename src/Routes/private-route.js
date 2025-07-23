import { Router } from 'express';

import { validateGetDataSurvey } from '../Validation/survey-validation.js';

// import { getOmihoUserData } from '../Controller/omiho-proxy-controller.js';
import SurveyController from '../Controller/survey-controller.js';
import { getLoggedInUser } from '../Controller/user-controller.js';

const router = Router();


router.post('/omiho-user-data', getLoggedInUser);

router.get('/get-data-survey-lokasi', SurveyController.getDataSurveyLocation);

router.get('/get-data-survey-monitoring', validateGetDataSurvey, SurveyController.getDataSurveyMonitoring);


export default router;