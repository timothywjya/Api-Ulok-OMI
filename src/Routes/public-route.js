import { Router } from 'express';

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

export default router;