import { Router } from 'express';
import { PublicSurveyController } from '../Controller/survey-controller.js';
import { UserPublicController } from '../Controller/user-controller.js';

const router = Router();

router.get('/health', (req, res) => {
    req.logger.info('Health check endpoint hit.');
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

router.get('/', (req, res) => {
    res.status(200).json({
        status: 'Success',
        message: 'Welcome to API Survey Lokasi OMI',
        status_code: 200,
    });
});

router.get('/get-data-public-survey-lokasi', PublicSurveyController.getPublicDataSurveyLocation);
router.get('/get-data-public-user', UserPublicController.getPublicDataUser);

export default router;