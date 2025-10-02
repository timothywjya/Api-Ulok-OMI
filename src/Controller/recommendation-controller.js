import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

const imagePathPrefix = knexConfig[process.env.NODE_ENV].imagePathPrefix;

const RECOMMENDED_LOCATION_SECRET_KEY = process.env.RECOMMENDATION_LOCATION_SECRET_KEY;
const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const BASE_URL = process.env.URL_IMAGE_PUBLIC;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const EXPIRATION_TIME = 20 * 60;

const s3Client = new S3Client({
    region: 'ap-southeast-3',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});

export class RecommendationController {
    static async getDataListRecommendedLocation(req, res, next) {
        try {
            const rawLocations = await db('recommended_locations')
                .select(
                    'recommended_locations.id',
                    'recommend_by',
                    'users.name as recommend_name',
                    'employee_identification_number as recommend_nik',
                    'longitude',
                    'latitude',
                    'province',
                    'city',
                    'district',
                    'sub_district',
                    'postal_code',
                    'address',
                    'keterangan',
                    db.raw("DATE_FORMAT(recommended_locations.created_at, '%Y-%m-%d') AS recommended_date"),
                )
                .join('users', 'users.id', '=', 'recommended_locations.recommend_by')
                .where('recommended_locations.branch_code', req.user.branch_code);

            const recommendedLocationIds = rawLocations.map(loc => loc.id);

            const rawImages = await db('images')
                .select(
                    'id',
                    'recommend_id',
                    'photo as photo_url',
                )
                .whereIn('recommend_id', recommendedLocationIds)
                .whereNotNull('recommend_id');

            const combinedData = await Promise.all(rawLocations.map(async (location) => {
                const locationImages = await Promise.all(rawImages
                    .filter(image => image.recommend_id === location.id)
                    .map(async (image) => {

                        const objectKey = `${imagePathPrefix}recommended_location/${image.photo_url}`;
                        const command = new GetObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: objectKey,
                        });

                        let photoUrl = '';
                        try {
                            photoUrl = await getSignedUrl(s3Client, command, { expiresIn: EXPIRATION_TIME });
                        } catch (err) {
                            console.error("Error generating pre-signed URL:", err);
                            photoUrl = 'URL_unavailable';
                        }

                        return {
                            ids: NodeHashIds.encode(image.id, IMAGE_SECRET_KEY),
                            photo_url: photoUrl,
                        };
                    }));

                const {
                    id,
                    recommend_by,
                    ...rest
                } = location;

                return {
                    ids: NodeHashIds.encode(id, RECOMMENDED_LOCATION_SECRET_KEY),
                    recommend_ids: NodeHashIds.encode(recommend_by, process.env.USER_SECRET_KEY),
                    ...rest,
                    images: locationImages,
                };
            }));
            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Recommended Location Successfully',
                data: combinedData
            });

        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.body || {}),
                'Failed to Get Data Survey',
                500,
                'Error',
                error.message || 'An unexpected error occurred'
            ));
        }
    }

    static async insertRecommendedLocation(req, res, next) {
        const userId = req.user.userIds;
        const decodeUserId = NodeHashIds.decode(userId, USER_SECRET_KEY);

        const { longitude, latitude, province, city, district, sub_district, postal_code, address, keterangan } = req.body;

        await db.transaction(async trx => {
            try {
                const insertData = {
                    longitude: longitude,
                    latitude: latitude,
                    province: province,
                    city: city,
                    district: district,
                    sub_district: sub_district,
                    postal_code: postal_code,
                    address: address,
                    keterangan: keterangan || null,
                    recommend_by: decodeUserId,
                    branch_code: req.user.branch_code,
                    created_at: db.fn.now(),
                    created_by: decodeUserId,
                    updated_at: db.fn.now()
                };

                const [recommendedId] = await trx('recommended_locations').insert(insertData, ['id']);

                const encodedRecommendedId = NodeHashIds.encode(recommendedId, RECOMMENDED_LOCATION_SECRET_KEY);

                await trx.commit();

                res.status(200).json({
                    status: 'Success',
                    status_code: '200',
                    message: 'Insert Data Recommended Locations Successfully',
                    recommended_ids: encodedRecommendedId
                });

            } catch (error) {
                await trx.rollback();

                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.headers || {}),
                    'Database Transaction Error',
                    400,
                    'Error',
                    error.message || 'Failed to save recommended location, please try again.'
                ));
            }

        });
    }
}

export default { RecommendationController };