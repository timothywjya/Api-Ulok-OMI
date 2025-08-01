import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

export class RecommendationController {
    static async getDataListRecommendedLocation(req, res, next) {
        const RECOMMENDED_LOCATION_SECRET_KEY = process.env.RECOMMENDATION_LOCATION_SECRET_KEY;
        const recommendedBy = req.user.userIds;

        try {
            const decryptedRecommendedById = NodeHashIds.decode(recommendedBy, process.env.USER_SECRET_KEY);
            let RecommendedById = parseInt(decryptedRecommendedById);

            const rawData = await db('recommended_locations')
                .select(
                    'recommended_locations.id',
                    'longitude',
                    "latitude",
                    "keterangan",
                    "recommend_by",
                    "users.name as name",
                    "employee_identification_number as nik"
                )
                .join('users', 'users.id', '=', 'recommended_locations.recommend_by')
                .where('recommend_by', RecommendedById)
                .andWhere('recommended_locations.branch_code', req.user.branch_code);

            const data = rawData.map(item => {
                const {
                    id,
                    recommend_by,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(id, RECOMMENDED_LOCATION_SECRET_KEY),
                    recommend_ids: NodeHashIds.encode(recommend_by, process.env.USER_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Recommended Location Sucessfully',
                data: data
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

    static async getDataDetailRecommendedLocation(req, res, next) {
        const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;
        const recommendedBy = req.query.recommended_ids;
        console.log(recommendedBy);
        try {
            const decryptedRecommendedId = NodeHashIds.decode(recommendedBy, process.env.RECOMMENDATION_LOCATION_SECRET_KEY);
            let RecLocId = parseInt(decryptedRecommendedId);

            const rawData = await db('images')
                .select(
                    'id',
                    'recommend_id',
                    "photo as photo_url",
                )
                .where('recommend_id', RecLocId)
                .whereNotNull('recommend_id');

            const data = rawData.map(item => {
                const {
                    id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(id, IMAGE_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Image Recommended Location Sucessfully',
                data_images: data
            });

        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.body || {}),
                'Internal Server Error',
                500,
                'Oops Something Wrong',
                error.message || 'Unknown error in get Photo'
            ));
        }
    }

    static async insertRecommendedLocation(req, res, next) {
        try {
            const query = await db('recommended_locations')
                .select(
                    'id',
                    'longitude',
                    "latitude",
                    "keterangan",
                    "recommended_by",
                    "users.name as name",
                    "employee_identification_number as nik"
                )
                .join('users', 'users.id', '=', 'recommended_locations.recommended_by')
                .where('recommended_by', req.query.recommended_by);

            const data = rawData.map(item => {
                const {
                    header_id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, LOCATION_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Sucessfully',
                data: data
            });

        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Survey Location',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }

    static async insertRecommendedImages(req, res, next) {
        try {
            const query = await db('recommended_locations')
                .select(
                    'id',
                    'longitude',
                    "latitude",
                    "keterangan",
                    "recommended_by",
                    "users.name as name",
                    "employee_identification_number as nik"
                )
                .join('users', 'users.id', '=', 'recommended_locations.recommended_by')
                .where('recommended_by', req.query.recommended_by);

            const data = rawData.map(item => {
                const {
                    header_id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, LOCATION_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Sucessfully',
                data: data
            });

        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Survey Location',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }
}

export default { RecommendationController };