import dotenv from 'dotenv';
import fs from 'fs';
import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV]);

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const SURVEY_LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;
const RECOMMENDED_LOCATION_SECRET_KEY = process.env.RECOMMENDATION_LOCATION_SECRET_KEY;

export class ImageController {
    static async uploadImages(req, res, next) {
        let parentId;
        let parentTable;
        let uploadDir;

        const userId = req.user.userIds;
        const decodedUserIdArray = NodeHashIds.decode(userId, USER_SECRET_KEY);
        const decodedUserId = parseInt(decodedUserIdArray);

        const { survey_header_ids, recommended_location_ids } = req.body;
        const photos = req.files ? (Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos]) : [];

        if (photos.length === 0) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Validation Error',
                400,
                'Bad Request',
                'No photos were uploaded.'
            ));
        }

        if (survey_header_ids) {
            parentTable = 'survey_id';
            uploadDir = path.join(__dirname, '..', '..', 'images', 'survey');
            const decodedId = NodeHashIds.decode(survey_header_ids, SURVEY_LOCATION_SECRET_KEY);
            parentId = parseInt(decodedId);
        } else if (recommended_location_ids) {
            parentTable = 'recommend_id';
            uploadDir = path.join(__dirname, '..', '..', 'images', 'recommended_location');
            const decodedId = NodeHashIds.decode(recommended_location_ids, RECOMMENDED_LOCATION_SECRET_KEY);
            parentId = parseInt(decodedId[0]);
        } else {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Validation Error',
                400,
                'Bad Request',
                'Either "survey_header_ids" or "recommended_location_ids" must be provided.'
            ));
        }

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uploadedPhotos = [];

        await db.transaction(async trx => {
            try {
                for (const photo of photos) {
                    if (photo.mimetype !== 'image/png') {
                        throw new Error(`File ${photo.name} is not a PNG. Only PNG files are allowed.`);
                    }

                    const timestamp = Date.now();
                    const uniqueFilename = `${NodeHashIds.encode(timestamp)}${path.extname(photo.name)}`;
                    const filePath = path.join(uploadDir, uniqueFilename);
                    await photo.mv(filePath);

                    const insertData = {
                        [parentTable]: parentId,
                        photo: uniqueFilename,
                        created_by: decodedUserId,
                        created_at: db.fn.now()
                    };

                    const [insertId] = await trx('images').insert(insertData);

                    uploadedPhotos.push({
                        id: insertId,
                        filename: uniqueFilename
                    });
                }

                await trx.commit();

                res.status(200).json({
                    status: 'success',
                    status_code: 201,
                    message: 'Images have been successfully uploaded.',
                });

            } catch (error) {
                await trx.rollback();
                console.error('Error during image upload transaction:', error);
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.headers || {}),
                    'Database Transaction Error',
                    400,
                    'Error',
                    error.message || 'Failed to upload images, please try again.'
                ));
            }
        });
    }
}