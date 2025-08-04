import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV]);
const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const QUESTION_SECRET_KEY = process.env.QUESTION_SECRET_KEY;
const OPTION_SECRET_KEY = process.env.OPTION_SECRET_KEY;

export class SurveyController {
    static async getDataSurvey(req, res, next) {
        const branchCode = req.user.branch_code;

        try {
            let implementedById = parseInt(NodeHashIds.decode(req.user.userIds, USER_SECRET_KEY));

            const rawData = await db('survey_headers')
                .select(
                    'survey_headers.id as header_id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    'survey_headers.check_in',
                    'survey_headers.check_out',
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    'survey_headers.implementation_date',
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN TRUE ELSE FALSE END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN TRUE WHEN survey_headers.is_prospect = 0 THEN FALSE ELSE NULL END AS prospect_status"),
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
                .andWhere('survey_headers.branch_code', branchCode)
                .andWhereRaw('survey_headers.implementation_date >= NOW()')
                .andWhere('survey_headers.is_visited', 0)
                .whereNull('survey_headers.deleted_at')
                .whereNull('survey_headers.deleted_by');

            const data = rawData.map(item => {
                const {
                    header_id,
                    visit_status,
                    prospect_status,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(header_id, LOCATION_SECRET_KEY),
                    ...rest,
                    visit_status: Boolean(visit_status),
                    prospect_status: prospect_status === 1 ? true : (prospect_status === 0 ? false : null)
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Location Successfully',
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

    static async getDataDetailSurveyLocation(req, res, next) {
        const surveyIds = req.query.survey_ids;

        try {
            const surveyId = NodeHashIds.decode(surveyIds, LOCATION_SECRET_KEY);
            let IdSurvey = parseInt(surveyId);

            const rawQuestions = await db('survey_details')
                .select(
                    'question_id',
                    'question_text as question',
                    'answer_input_type'
                )
                .join("master_questions", "master_questions.id", '=', "question_id")
                .where("survey_header_id", IdSurvey);

            const questionIds = rawQuestions.map(q => q.question_id);

            const rawOptions = await db('master_options')
                .select(
                    'id',
                    'question_id',
                    'option_group',
                    'option_code',
                    'option_label'
                )
                .whereIn("question_id", questionIds);

            const questionsWithNestedOptions = rawQuestions.map(question => {
                const questionObject = {
                    question_ids: NodeHashIds.encode(question.question_id, QUESTION_SECRET_KEY),
                    question: question.question,
                    answer_input_type: question.answer_input_type,
                };

                if (question.answer_input_type.toUpperCase() === 'SELECT') {
                    const options = rawOptions
                        .filter(option => option.question_id === question.question_id)
                        .map(option => ({
                            option_ids: NodeHashIds.encode(option.id, OPTION_SECRET_KEY),
                            option_group: option.option_group,
                            option_code: option.option_code,
                            option_label: option.option_label,
                        }));

                    questionObject.options = options;
                }

                return questionObject;
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Question and Options Survey Location Sucessfully',
                data: questionsWithNestedOptions
            });

        } catch (error) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.body || {}),
                'Failed to Get Data Question and Options Survey Location',
                500,
                'Error',
                error.message || 'Unknown error in getLoggedInUser'
            ));
        }
    }

    static async insertDataSurveyLocation(req, res, next) {
        const userId = NodeHashIds.decode(req.user.userIds, USER_SECRET_KEY);
        const { check_in, check_out, is_prospect, survey_header_ids, answer } = req.body.data;

        if (!answer || !Array.isArray(answer) || answer.length === 0) {
            return next(new CustomError(
                req.originalUrl,
                JSON.stringify(req.headers || {}),
                'Validation Error',
                400,
                'Bad Request',
                'Request body must contain a non-empty "data.answer" array.'
            ));
        }

        const survey_header_id_decoded = NodeHashIds.decode(survey_header_ids, LOCATION_SECRET_KEY);
        const decodedSurveyHeaderId = parseInt(survey_header_id_decoded);

        await db.transaction(async trx => {
            try {
                const headerUpdateData = {
                    check_in: check_in || db.fn.now(),
                    check_out: check_out || db.fn.now(),
                    is_prospect: is_prospect,
                    is_visited: 1,
                    updated_by: userId,
                    updated_at: db.fn.now()
                };

                await trx('survey_headers')
                    .where('id', decodedSurveyHeaderId)
                    .update(headerUpdateData);

                for (const element of answer) {
                    const question_id_decoded = NodeHashIds.decode(element.question_ids, QUESTION_SECRET_KEY);
                    const decodedQuestionId = parseInt(question_id_decoded);

                    let answer_id_to_insert = null;
                    let answer_text_to_insert = element.answer_text || null;

                    if (element.option_ids) {
                        const option_id_decoded = NodeHashIds.decode(element.option_ids, OPTION_SECRET_KEY);
                        answer_id_to_insert = parseInt(option_id_decoded);
                    } else {
                        answer_id_to_insert = null;
                        answer_text_to_insert = element.answer_text;
                    }

                    const existingAnswer = await trx('survey_details')
                        .where('survey_header_id', decodedSurveyHeaderId)
                        .andWhere('question_id', decodedQuestionId)
                        .first();

                    await trx('survey_details')
                        .where('id', existingAnswer.id)
                        .update({
                            answer_id: answer_id_to_insert,
                            answer_text: answer_text_to_insert,
                            updated_by: userId,
                            updated_at: db.fn.now()
                        });
                }

                await trx.commit();

                res.status(200).json({
                    status: 'success',
                    status_code: 200,
                    message: 'Survey data has been successfully saved.'
                });

            } catch (error) {
                await trx.rollback();
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify(req.headers || {}),
                    'Database Transaction Error',
                    400,
                    'Error',
                    error.message || 'Failed to save data, please try again.'
                ));
            }
        });
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
                    db.raw("CASE WHEN survey_headers.is_visited = 1 THEN True ELSE False END AS visit_status"),
                    db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN True ELSE False END AS prospect_status"),
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