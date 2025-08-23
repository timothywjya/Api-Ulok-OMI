import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';

dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV]);
const imagePathPrefix = knexConfig[process.env.NODE_ENV].imagePathPrefix;

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const SURVEY_LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;
const RECOMMENDED_LOCATION_SECRET_KEY = process.env.RECOMMENDATION_LOCATION_SECRET_KEY;
const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;

const s3Client = new S3Client({
    region: 'ap-southeast-3',
    endpoint: process.env.S3_ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});

export class ImageController {
    static async uploadImages(req, res, next) {
        let parentId;
        let parentTable;
        let s3UploadFolder;

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

        if ((survey_header_ids && recommended_location_ids) || (!survey_header_ids && !recommended_location_ids)) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Validation Error',
                400,
                'Bad Request',
                'Either "survey_header_ids" or "recommended_location_ids" must be provided.'
            ));
        }

        if (survey_header_ids) {
            parentTable = 'survey_id';
            s3UploadFolder = `${imagePathPrefix}survey/`;
            const decodedId = NodeHashIds.decode(survey_header_ids, SURVEY_LOCATION_SECRET_KEY);
            parentId = parseInt(decodedId);
        } else if (recommended_location_ids) {
            parentTable = 'recommend_id';
            s3UploadFolder = `${imagePathPrefix}recommended_location/`;
            const decodedId = NodeHashIds.decode(recommended_location_ids, RECOMMENDED_LOCATION_SECRET_KEY);
            parentId = parseInt(decodedId);
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

        const uploadedPhotos = [];

        await db.transaction(async trx => {
            try {
                for (const photo of photos) {
                    if (photo.mimetype !== 'image/png' && photo.mimetype !== 'image/jpeg') {
                        throw new Error(`File ${photo.name} is not a PNG/JPEG. Only PNG/JPEG files are allowed.`);
                    }

                    const fileExtension = path.extname(photo.name).toLowerCase();

                    if (fileExtension !== '.png' && fileExtension !== '.jpeg' && fileExtension !== '.jpg') {
                        throw new Error(`File ${photo.name} has an invalid extension. Only .png, .jpeg, or .jpg are allowed.`);
                    }

                    const timestamp = Date.now();
                    const uniqueFilename = `${NodeHashIds.encode(timestamp)}${fileExtension}`;
                    const s3Key = `${s3UploadFolder}/${uniqueFilename}`;

                    const uploadParams = {
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: s3Key,
                        Body: photo.data,
                        ContentType: photo.mimetype,
                    };

                    try {
                        const command = new PutObjectCommand(uploadParams);
                        await s3Client.send(command);
                        console.log(`Successfully uploaded ${uniqueFilename} to S3 bucket.`);
                    } catch (s3Error) {
                        console.error('S3 Upload Error:', s3Error);
                        throw new Error(`Failed to upload file to S3: ${s3Error.message}`);
                    }

                    const insertData = {
                        [parentTable]: parentId,
                        photo: uniqueFilename,
                        created_by: decodedUserId,
                        created_at: db.fn.now()
                    };

                    const [insertId] = await trx('images').insert(insertData);

                    uploadedPhotos.push({
                        id: insertId,
                        s3Key: s3Key
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
        const S3_BASE_URL = process.env.URL_IMAGE_PUBLIC;

        try {
            const survey_ids = req.query.survey_ids;
            const recommended_ids = req.query.recommended_ids;

            const authorizationHeader = req.headers['authorization'];
            if (authorizationHeader !== IMAGE_SECRET_KEY) {
                return next(
                    new CustomError(
                        req.originalUrl,
                        JSON.stringify(req.headers || {}),
                        'Authorization Error',
                        401,
                        'Unauthorized',
                        'Authentication failed. Invalid API key.'
                    )
                );
            }

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
            let parentType = null;

            if (recommended_ids) {
                parentType = 'recommended_location';
                const decodedId = NodeHashIds.decode(recommended_ids, RECOMMENDED_LOCATION_SECRET_KEY);

                if (!Number.isFinite(decodedId)) {
                    return next(new CustomError(
                        req.originalUrl,
                        JSON.stringify(req.headers || {}),
                        'Validation Error',
                        400,
                        'Bad Request',
                        'Invalid recommended ID. Could not be decoded.'
                    ));
                }

                query = query.where('recommend_id', decodedId);

            } else if (survey_ids) {
                parentType = 'survey';
                const decodedId = NodeHashIds.decode(survey_ids, SURVEY_LOCATION_SECRET_KEY);

                if (!Number.isFinite(decodedId)) {
                    return next(new CustomError(
                        req.originalUrl,
                        JSON.stringify(req.headers || {}),
                        'Validation Error',
                        400,
                        'Bad Request',
                        'Invalid survey ID. Could not be decoded.'
                    ));
                }

                query = query.where('survey_id', decodedId);
            }

            const allImages = await query;

            const encodedImagesWithUrl = allImages.map(image => {
                const encodedId = NodeHashIds.encode(image.id, IMAGE_SECRET_KEY);
                const photoUrl = `${imagePathPrefix}${parentType}/${image.photo}`;

                return {
                    image_ids: encodedId,
                    path: photoUrl
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