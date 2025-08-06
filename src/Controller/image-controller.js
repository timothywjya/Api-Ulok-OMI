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
const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;

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
                    status_code: 200,
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

export class PublicImageController {
    static async getPublicDataImages(req, res, next) {
        const BASE_URL = process.env.URL_IMAGE_PUBLIC;
        try {

            const survey_ids = req.query.survey_ids;
            const recommended_ids = req.query.recommended_ids;

            if (!survey_ids && !recommended_ids) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.headers || {}),
                    'Validation Error',
                    400,
                    'Bad Request',
                    'Anda harus mengisi salah satu dari recommended_ids atau survey_ids.'
                ));
            }

            if (survey_ids && recommended_ids) {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.headers || {}),
                    'Validation Error',
                    400,
                    'Bad Request',
                    'Hanya salah satu dari recommended_ids atau survey_ids yang boleh diisi.'
                ));
            }

            let query = db('images').select('*');

            if (recommended_ids) {
                const decodedId = NodeHashIds.decode(recommended_ids, process.env.RECOMMENDED_LOCATION_SECRET_KEY);
                query = query.where('recommended_id', decodedId);
            } else if (survey_ids) {
                const decodedId = NodeHashIds.decode(survey_ids, process.env.SURVEY_LOCATION_SECRET_KEY);
                query = query.where('survey_id', decodedId);
            }

            const allImages = await query;

            const encodedImagesWithUrl = allImages.map(image => {
                const encodedId = NodeHashIds.encode(image.id, IMAGE_SECRET_KEY);
                let photoUrl;

                if (image.recommended_id) {
                    photoUrl = `${BASE_URL}recommended_location/${image.photo}`;
                } else {
                    photoUrl = `${BASE_URL}survey/${image.photo}`;
                }

                return {
                    image_ids: encodedId,
                    url: photoUrl
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Image Public Survey',
                data: encodedImagesWithUrl
            });
        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Database Error',
                500,
                'Internal Server Error',
                error.message || 'Gagal mengambil data survey lokasi.'
            ));
        }
    }
}

export default { ImageController, PublicImageController };