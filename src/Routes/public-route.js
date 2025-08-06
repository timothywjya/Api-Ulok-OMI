import { Router } from 'express';
import { validateImageKey } from '../Application/Middleware/ImageMiddleware.js';
import { PublicImageController } from '../Controller/image-controller.js';

const router = Router();

router.get('/', (req, res) => {
    res.status(200).json({
        status: 'Success',
        message: 'Welcome to API Survey Lokasi OMI',
        status_code: 200,
    });
});

router.get('/get-data-public-image', validateImageKey, PublicImageController.getPublicDataImages);

export default router;