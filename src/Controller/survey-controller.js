import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

export class SurveyController {
    static async getDataSurveyLocation(req, res, next) {
        const encryptedImplementedById = req.query.implemented_by;
        // const encryptedSurveyTypeId = req.query.surveyType;
        const branchCode = req.query.branch_code;

        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        // const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

        try {
            const decryptedImplementedById = NodeHashIds.decode(encryptedImplementedById, USER_SECRET_KEY);
            let implementedById = parseInt(decryptedImplementedById);

            // const decryptedSurveyTypeId = NodeHashIds.decode(encryptedSurveyTypeId, SURVEY_TYPE_SECRET_KEY);
            // let surveyTypeId = parseInt(decryptedSurveyTypeId);

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
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status"),
                    'master_identities.full_name as member_fullname',
                    'master_identities.phone_number as member_phone',
                    'store_locations.province as member_province',
                    'store_locations.city as member_city',
                    'store_locations.district as member_district',
                    'store_locations.sub_district as member_sub_district',
                    'store_locations.address as member_address',
                    'store_locations.postal_code as member_postal_code',
                    'store_locations.customer_type as member_customer_type',
                    'store_locations.survey_information_source as member_survey_information_source',
                    'store_locations.ownership_status as member_ownership_status',
                    'store_locations.site_type as member_site_type',
                    'store_locations.length as member_length',
                    'store_locations.width as member_width',
                    'store_locations.total_floors as member_total_floors',
                    'store_locations.longitude as member_longitude',
                    'store_locations.latitude as member_latitude',
                    'store_locations.personnel_status as member_personnel_status',
                    'store_locations.notes as member_notes'
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .join('store_locations', 'store_locations.id', '=', 'survey_headers.store_location_id')
                .join('master_identities', 'store_locations.identity_id', '=', 'master_identities.id')
                .where('survey_headers.implemented_by', implementedById)
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('master_survey_types.id', 1)
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
                message: 'Get Data Survey Location Sucessfully',
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

        const QUESTION_SECRET_KEY = process.env.QUESTION_SECRET_KEY;
        const OPTION_SECRET_KEY = process.env.OPTION_SECRET_KEY;
        const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;

        try {
            const surveyId = NodeHashIds.decode(surveyIds, LOCATION_SECRET_KEY);
            let IdSurvey = parseInt(surveyId);

            const rawQuestion = await db('survey_details')
                .select(
                    'question_id',
                    'question_text as question',
                    'answer_input_type'
                )
                .join("master_questions", "master_questions.id", '=', "question_id")
                .where("survey_header_id", IdSurvey);

            const questionIds = rawQuestion.map(q => q.question_id);

            const rawOption = await db('master_options')
                .select(
                    'id',
                    'question_id',
                    'option_group',
                    'option_code',
                    'option_label'
                )
                .whereIn("question_id", questionIds);

            const dataQuestion = rawQuestion.map(item => {
                const {
                    question_id,
                    ...rest
                } = item;

                return {
                    question_ids: NodeHashIds.encode(question_id, QUESTION_SECRET_KEY),
                    ...rest
                };
            });

            const dataOption = rawOption.map(item => {
                const {
                    id,
                    question_id,
                    ...rest
                } = item;

                return {
                    option_ids: NodeHashIds.encode(id, OPTION_SECRET_KEY),
                    question_ids: NodeHashIds.encode(question_id, QUESTION_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Question and Options Survey Location Sucessfully',
                data: [dataQuestion, dataOption]
            });

        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Question and Options Survey Location',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }

    static async insertDataSurveyLocation(req, res, next) {
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
        const encryptedImplementedById = req.query.implemented_by;
        const branchCode = req.query.branch_code;
        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        // const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const MONITORING_SECRET_KEY = process.env.MONITORING_SECRET_KEY;

        try {
            const decryptedImplementedById = NodeHashIds.decode(encryptedImplementedById, USER_SECRET_KEY);
            let implementedById = parseInt(decryptedImplementedById);
            console.log(implementedById);
            // const decryptedSurveyTypeId = NodeHashIds.decode(encryptedSurveyTypeId, SURVEY_TYPE_SECRET_KEY);
            // let surveyTypeId = parseInt(decryptedSurveyTypeId);

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
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status"),
                    'master_identities.full_name as member_fullname',
                    'master_identities.phone_number as member_phone',
                    'store_locations.province as member_province',
                    'store_locations.city as member_city',
                    'store_locations.district as member_district',
                    'store_locations.sub_district as member_sub_district',
                    'store_locations.address as member_address',
                    'store_locations.postal_code as member_postal_code',
                    'store_locations.customer_type as member_customer_type',
                    'store_locations.survey_information_source as member_survey_information_source',
                    'store_locations.ownership_status as member_ownership_status',
                    'store_locations.site_type as member_site_type',
                    'store_locations.length as member_length',
                    'store_locations.width as member_width',
                    'store_locations.total_floors as member_total_floors',
                    'store_locations.longitude as member_longitude',
                    'store_locations.latitude as member_latitude',
                    'store_locations.personnel_status as member_personnel_status',
                    'store_locations.notes as member_notes'
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .join('store_locations', 'store_locations.id', '=', 'survey_headers.store_location_id')
                .join('master_identities', 'store_locations.identity_id', '=', 'master_identities.id')
                .where('survey_headers.implemented_by', implementedById)
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('master_survey_types.id', 2)
                .andWhere('survey_headers.branch_code', branchCode)
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0);

            const data = rawData.map(item => {
                const {
                    header_id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, MONITORING_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Monitoring Sucessfully',
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

    static async getDataDetailSurveyMonitoring(req, res, next) {
        const surveyIds = req.query.survey_ids;

        const QUESTION_SECRET_KEY = process.env.QUESTION_SECRET_KEY;
        const OPTION_SECRET_KEY = process.env.OPTION_SECRET_KEY;
        const MONITORING_SECRET_KEY = process.env.MONITORING_SECRET_KEY;

        try {
            const surveyId = NodeHashIds.decode(surveyIds, MONITORING_SECRET_KEY);
            let IdSurvey = parseInt(surveyId);

            const rawQuestion = await db('survey_details')
                .select(
                    'question_id',
                    'question_text as question',
                    'answer_input_type'
                )
                .join("master_questions", "master_questions.id", '=', "question_id")
                .where("survey_header_id", IdSurvey);

            const questionIds = rawQuestion.map(q => q.question_id);

            const rawOption = await db('master_options')
                .select(
                    'id',
                    'question_id',
                    'option_group',
                    'option_code',
                    'option_label'
                )
                .whereIn("question_id", questionIds);

            const dataQuestion = rawQuestion.map(item => {
                const {
                    question_id,
                    ...rest
                } = item;

                return {
                    question_ids: NodeHashIds.encode(question_id, QUESTION_SECRET_KEY),
                    ...rest
                };
            });

            const dataOption = rawOption.map(item => {
                const {
                    id,
                    question_id,
                    ...rest
                } = item;

                return {
                    option_ids: NodeHashIds.encode(id, OPTION_SECRET_KEY),
                    question_ids: NodeHashIds.encode(question_id, QUESTION_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Question and Options Survey Monitoring Sucessfully',
                data: [dataQuestion, dataOption]
            });

        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Question and Options Survey Monitoring',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }

    static async insertDataSurveyMonitoring(req, res, next) {
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

    static async insertImageSurveyMonitoring(req, res, next) {
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

    static async getDataAnsweredSurveyLocation(req, res, next) {
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

    static async getDataDetailAnsweredSurveyLocation(req, res, next) {
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

    static async getDataAnsweredSurveyMonitoring(req, res, next) {
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

    static async getDataDetailAnsweredSurveyMonitoring(req, res, next) {
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
}

export class PublicSurveyController {
    static async getPublicDataSurveyLocation(req, res, next) {
        const encryptedImplementedById = req.query.implemented_by;
        // const encryptedSurveyTypeId = req.query.surveyType;
        const branchCode = req.query.branch_code;

        const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
        // const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;
        const MONITORING_SECRET_KEY = process.env.SURVEY_MONITORING_SECRET_KEY;

        try {
            const decryptedImplementedById = NodeHashIds.decode(encryptedImplementedById, USER_SECRET_KEY);
            let implementedById = parseInt(decryptedImplementedById);

            // const decryptedSurveyTypeId = NodeHashIds.decode(encryptedSurveyTypeId, SURVEY_TYPE_SECRET_KEY);
            // let surveyTypeId = parseInt(decryptedSurveyTypeId);

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
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN 'BERPOTENSI' ELSE 'KURANG BERPOTENSI' END AS prospect_status"),
                    'master_identities.full_name as member_fullname',
                    'master_identities.phone_number as member_phone',
                    'store_locations.province as member_province',
                    'store_locations.city as member_city',
                    'store_locations.district as member_district',
                    'store_locations.sub_district as member_sub_district',
                    'store_locations.address as member_address',
                    'store_locations.postal_code as member_postal_code',
                    'store_locations.customer_type as member_customer_type',
                    'store_locations.survey_information_source as member_survey_information_source',
                    'store_locations.ownership_status as member_ownership_status',
                    'store_locations.site_type as member_site_type',
                    'store_locations.length as member_length',
                    'store_locations.width as member_width',
                    'store_locations.total_floors as member_total_floors',
                    'store_locations.longitude as member_longitude',
                    'store_locations.latitude as member_latitude',
                    'store_locations.personnel_status as member_personnel_status',
                    'store_locations.notes as member_notes'
                )
                .join('master_survey_types', 'survey_headers.survey_type', '=', 'master_survey_types.id')
                .join('users', 'users.id', '=', 'survey_headers.implemented_by')
                .join('store_locations', 'store_locations.id', '=', 'survey_headers.store_location_id')
                .join('master_identities', 'store_locations.identity_id', '=', 'master_identities.id')
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('master_survey_types.id', 2)
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0);

            const data = rawData.map(item => {
                const {
                    header_id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, MONITORING_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Monitoring Sucessfully',
                data: data
            });

        } catch (error) {
            next(new CustomError(
                'Failed to Get Data Survey Monitoring',
                error.statusCode || 500,
                'Error',
                error.message
            ));
        }
    }
}

export default { SurveyController, PublicSurveyController };