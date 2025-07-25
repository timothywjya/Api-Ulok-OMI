import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

class RecommendationController {
    static async getDataListRecommendedLocation(req, res, next) {
        const RECOMMENDED_LOCATION_SECRET_KEY = env.process.RECOMMENDATION_LOCATION_SECRET_KEY;
        const recommendedBy = req.query.recommended_by;

        try {
            const decryptedRecommendedById = decryptId(recommendedBy, USER_SECRET_KEY);
            let RecommendedById = parseInt(decryptedRecommendedById);

            const rawData = await db('recommended_locations')
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
                .where('recommended_by', RecommendedById);

            const data = rawData.map(item => {
                const {
                    id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, RECOMMENDED_LOCATION_SECRET_KEY),
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
            next(new CustomError(
                'Failed to Get Data Survey Location',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }

    static async getDataDetailRecommendedLocation(req, res, next) {
        const USER_SECRET_KEY = env.process.USER_SECRET_KEY;
        const RecommendedId = req.query.RecommendedId;

        try {
            const decryptedRecommendedId = decryptId(RecommendedId, USER_SECRET_KEY);
            let RecLocId = parseInt(decryptedRecommendedId);

            const rawData = await db('recommended_locations')
                .select(
                    'id',
                    'longitude',
                    "latitude",
                    "keterangan",
                    "recommended_by",
                    "users.name as name",
                    "employee_identification_number as nik"
                )
                .where('id', RecLocId);

            const data = rawData.map(item => {
                const {
                    id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, RECOMMENDED_LOCATION_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Recommended Location Sucessfully',
                data_header: data,
                data_images: image
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