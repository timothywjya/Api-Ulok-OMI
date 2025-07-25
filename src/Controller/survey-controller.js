import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

export class SurveyController {
    static async getDataSurveyLocation(req, res, next) {
        const encryptedImplementedById = req.query.implementedBy;
        const encryptedSurveyTypeId = req.query.surveyType;
        const branchCode = req.query.branchCode;

        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

        try {
            const decryptedImplementedById = NodeHashIds.decode(encryptedImplementedById, USER_SECRET_KEY);
            let implementedById = parseInt(decryptedImplementedById);

            const decryptedSurveyTypeId = NodeHashIds.decode(encryptedSurveyTypeId, SURVEY_TYPE_SECRET_KEY);
            let surveyTypeId = parseInt(decryptedSurveyTypeId);

            const rawData = await db('survey_headers')
                .select(
                    'survey_headers.id as header_id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    db.raw("DATE_FORMAT(survey_headers.check_in, '%d-%m-%Y %H:%i') AS check_in"),
                    db.raw("DATE_FORMAT(survey_headers.check_out, '%d-%m-%Y %H:%i') AS check_out"),
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    db.raw("DATE_FORMAT(survey_headers.implementation_date, '%e %M %Y') AS survey_date"),
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN 'SUDAH DIKUNJUNGI' ELSE 'BELUM DIKUNJUNGI' END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status")
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .where('survey_headers.implemented_by', implementedById)
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('master_survey_types.id', surveyTypeId)
                .andWhere('survey_headers.branch_code', branchCode)
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0);

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

    static async getDataDetailSurveyLocation(req, res, next) {
        const surveyIds = req.query.survey_ids;
        const encryptedImplementedById = req.query.implementedBy;
        const branchCode = req.query.branchCode;

        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

        try {
            const surveyId = NodeHashIds.decode(surveyIds, LOCATION_SECRET_KEY);
            let IdSurvey = parseInt(surveyId);

            const decryptedImplementedById = NodeHashIds.decode(encryptedImplementedById, USER_SECRET_KEY);
            let implementedById = parseInt(decryptedImplementedById);

            const rawData = await db('survey_headers')
                .select(
                    'survey_headers.id as header_id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    db.raw("DATE_FORMAT(survey_headers.check_in, '%d-%m-%Y %H:%i') AS check_in"),
                    db.raw("DATE_FORMAT(survey_headers.check_out, '%d-%m-%Y %H:%i') AS check_out"),
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    db.raw("DATE_FORMAT(survey_headers.implementation_date, '%e %M %Y') AS survey_date"),
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN 'SUDAH DIKUNJUNGI' ELSE 'BELUM DIKUNJUNGI' END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status")
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .where('survey_headers.implemented_by', implementedById)
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('master_survey_types.id', surveyTypeId)
                .andWhere('survey_headers.branch_code', branchCode)
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0);

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

    static async getDataSurveyMonitoring(req, res, next) {
        try {
            const implementedById = parseInt(req.query.implementedById);
            const surveyTypeId = parseInt(req.query.surveyTypeId);

            const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

            if (isNaN(implementedById) || isNaN(surveyTypeId)) {
                throw new CustomError('Parameter query (implementedById, surveyTypeId) tidak lengkap atau tidak valid.', 400);
            }
            if (!LOCATION_SECRET_KEY) {
                throw new CustomError('Kunci enkripsi (SURVEY_LOCATION_SECRET_KEY) belum diatur di environment.', 500);
            }

            const rawData = await db('survey_headers')
                .select(
                    'survey_headers.id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    db.raw("DATE_FORMAT(survey_headers.check_in, '%d-%m-%Y %H:%i') AS check_in"),
                    db.raw("DATE_FORMAT(survey_headers.check_out, '%d-%m-%Y %H:%i') AS check_out"),
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    db.raw("DATE_FORMAT(survey_headers.implementation_date, '%e %M %Y') AS survey_date"),
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN 'SUDAH DIKUNJUNGI' ELSE 'BELUM DIKUNJUNGI' END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status")
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .where('survey_headers.implemented_by', implementedById)
                .andWhere('master_survey_types.id', surveyTypeId)
                .andWhere('survey_headers.is_visited', 1)
                .andWhereNotNull('survey_headers.check_in')
                .andWhereNotNull('survey_headers.check_out');

            const data = rawData.map(item => {
                const { id, ...rest } = item;

                return {
                    ids: encryptId(id, LOCATION_SECRET_KEY),
                    ...rest,
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
                'Terjadi kesalahan saat mengambil data survey monitoring',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }
}

export class PublicSurveyController {
    static async getPublicDataSurveyLocation(req, res, next) {
        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

        try {
            const rawData = await db('survey_headers')
                .select(
                    'survey_headers.id as header_id',
                    'users.id as user_id',
                    'master_survey_types.id as survey_type_id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    db.raw("DATE_FORMAT(survey_headers.check_in, '%d-%m-%Y %H:%i') AS check_in"),
                    db.raw("DATE_FORMAT(survey_headers.check_out, '%d-%m-%Y %H:%i') AS check_out"),
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    db.raw("DATE_FORMAT(survey_headers.implementation_date, '%e %M %Y') AS survey_date"),
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN 'SUDAH DIKUNJUNGI' ELSE 'BELUM DIKUNJUNGI' END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status")
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0);

            const data = rawData.map(item => {
                const {
                    header_id,
                    user_id,
                    survey_type_id,
                    ...rest
                } = item;

                return {
                    header_ids: NodeHashIds.encode(header_id, LOCATION_SECRET_KEY),
                    user_ids: NodeHashIds.encode(user_id, USER_SECRET_KEY),
                    survey_type_ids: NodeHashIds.encode(survey_type_id, SURVEY_TYPE_SECRET_KEY),
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

export default { SurveyController, PublicSurveyController };