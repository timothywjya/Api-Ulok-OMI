import { Router } from 'express';
import { PublicSurveyController } from '../Controller/survey-controller.js';
import { SurveyTypeController } from '../Controller/survey-type-controller.js';
import { UserPublicController } from '../Controller/user-controller.js';

const router = Router();

router.get('/', (req, res) => {
    res.status(200).json({
        status: 'Success',
        message: 'Welcome to API Survey Lokasi OMI',
        status_code: 200,
    });
});

router.get('/get-data-public-survey-location', PublicSurveyController.getPublicDataSurveyLocation);
router.get('/get-data-public-survey-monitoring', PublicSurveyController.getPublicDataSurveyLocation);
router.get('/get-data-public-user', UserPublicController.getPublicDataUser);
router.get('/get-data-public-survey-type', SurveyTypeController.getDataSurveyType);

export default router;