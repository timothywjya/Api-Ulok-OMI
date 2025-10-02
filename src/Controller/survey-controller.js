import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import { ROLE_ID_MAP } from '../Helper/constanta.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();

const db = knex(knexConfig[process.env.NODE_ENV]);

const imagePathPrefix = knexConfig[process.env.NODE_ENV].imagePathPrefix;

const LOCATION_SECRET_KEY = process.env.SURVEY_LOCATION_SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
const QUESTION_SECRET_KEY = process.env.QUESTION_SECRET_KEY;
const OPTION_SECRET_KEY = process.env.OPTION_SECRET_KEY;
const BASE_URL = process.env.URL_IMAGE_PUBLIC;
const IMAGE_SECRET_KEY = process.env.IMAGE_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const EXPIRATION_TIME = 20 * 60;

const s3Client = new S3Client({
    region: 'ap-southeast-3',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});

export class SurveyController {
    static async getDataSurvey(req, res, next) {
        const branchCode = req.user.branch_code;

        try {
            let implementedById = parseInt(NodeHashIds.decode(req.user.userIds, USER_SECRET_KEY));

            let rawData = db('survey_headers')
                .select(
                    'survey_headers.id as header_id',
                    db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                    db.raw("DATE_FORMAT(survey_headers.check_in, '%Y-%m-%d') AS check_in"),
                    db.raw("DATE_FORMAT(survey_headers.check_out, '%Y-%m-%d') AS check_out"),
                    'users.name',
                    'users.employee_identification_number as nik',
                    'users.branch_code',
                    db.raw("DATE_FORMAT(implementation_date, '%Y-%m-%d') AS implementation_date"),
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
                .andWhereRaw('DATE(survey_headers.implementation_date) = CURRENT_DATE()')
                .whereNull('survey_headers.check_in')
                .whereNull('survey_headers.check_out')
                .andWhere('survey_headers.is_visited', 0)
                .whereNull('survey_headers.deleted_at')
                .whereNull('survey_headers.deleted_by');

            if (req.user.role_ids === ROLE_ID_MAP['SR.CLERK']) {
                rawData = rawData.andWhere('survey_headers.survey_type', 1);
            } else if (ROLE_ID_MAP['SUPERVISOR'].includes(req.user.role_ids)) {
                rawData = rawData.andWhere('survey_headers.survey_type', 2);
            } else {
                return next(new CustomError(
                    req.originalUrl,
                    JSON.stringify({ role_id: req.user.role_id }),
                    'Forbidden',
                    403,
                    'Access Denied',
                    'You do not have any access to Get any Surveys'
                ));
            }
            const finalData = await rawData;

            const headerIds = finalData.map(item => item.header_id);

            if (headerIds.length === 0) {
                return res.status(200).json({
                    status: 'Success',
                    status_code: '200',
                    message: 'No survey data found for today',
                    data: []
                });
            }

            const rawQuestions = await db('survey_details')
                .select(
                    'survey_details.survey_header_id',
                    'master_questions.id as question_id',
                    'master_questions.question_text as question',
                    'master_questions.answer_input_type'
                )
                .join("master_questions", "master_questions.id", '=', "survey_details.question_id")
                .whereIn('survey_details.survey_header_id', headerIds);

            const questionIds = rawQuestions.map(q => q.question_id);
            const rawOptions = await db('master_options')
                .select(
                    'id',
                    'question_id',
                    'option_group',
                    'option_code',
                    'option_label'
                )
                .whereIn("question_id", questionIds)
                .whereNull("deleted_at")
                .whereNull("deleted_by");

            const data = finalData.map(item => {
                const {
                    header_id,
                    visit_status,
                    prospect_status,
                    ...rest
                } = item;

                const questions = rawQuestions
                    .filter(q => q.survey_header_id === header_id)
                    .map(question => {
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

                return {
                    ids: NodeHashIds.encode(header_id, LOCATION_SECRET_KEY),
                    ...rest,
                    visit_status: Boolean(visit_status),
                    prospect_status: prospect_status === 1 ? true : (prospect_status === 0 ? false : null),
                    questions: questions
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

    static async insertDataSurveyLocation(req, res, next) {
        const userId = NodeHashIds.decode(req.user.userIds, USER_SECRET_KEY);
        const { check_in, check_out, is_prospect, survey_header_ids, answer } = req.body;

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

    static async getDataHistorySurvey(req, res, next) {
        const { userIds, branch_code } = req.user;

        try {
            const implementedById = NodeHashIds.decode(userIds, USER_SECRET_KEY);

            const allImages = await db('images')
                .select('images.id', 'photo', 'survey_id')
                .join('survey_headers', 'survey_headers.id', 'images.survey_id')
                .where('survey_headers.implemented_by', implementedById)
                .andWhere('survey_headers.branch_code', branch_code)
                .andWhere('survey_headers.implementation_date', '>', db.raw('DATE_SUB(NOW(), INTERVAL 1 MONTH)'))
                .andWhere('survey_headers.is_visited', 1)
                .andWhere('survey_headers.branch_code', req.user.branch_code)
                .andWhere('survey_headers.implemented_by', NodeHashIds.decode(req.user.userIds, USER_SECRET_KEY))
                .whereNotNull('survey_headers.check_in')
                .whereNotNull('survey_headers.check_out')
                .whereNull('survey_headers.deleted_at');

            if (allImages.length === 0) {
                return res.status(200).json({
                    status: 'Success',
                    status_code: '200',
                    message: 'No survey history data with images found for the last month.',
                    data: []
                });
            }

            const headerIds = [...new Set(allImages.map(item => item.survey_id))];

            const groupedImages = {};
            await Promise.all(allImages.map(async (image) => {
                if (!groupedImages[image.survey_id]) {
                    groupedImages[image.survey_id] = [];
                }

                const objectKey = `${imagePathPrefix}survey/${image.photo}`;
                const command = new GetObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: objectKey,
                });

                let signedUrl = '';
                try {
                    signedUrl = await getSignedUrl(s3Client, command, { expiresIn: EXPIRATION_TIME });
                } catch (err) {
                    console.error("Error generating pre-signed URL:", err);
                    signedUrl = 'URL_unavailable';
                }

                groupedImages[image.survey_id].push({
                    image_ids: NodeHashIds.encode(image.id, IMAGE_SECRET_KEY),
                    url: signedUrl
                });
            }));

            const [rawData, rawAnswers] = await Promise.all([
                db('survey_headers')
                    .select(
                        'survey_headers.id as header_id',
                        db.raw("CASE master_survey_types.survey_type WHEN 'survey_monitoring' THEN 'Survey Monitoring' WHEN 'survey_lokasi' THEN 'Survey Lokasi' ELSE master_survey_types.survey_type END AS survey_type"),
                        db.raw("DATE_FORMAT(survey_headers.check_in, '%Y-%m-%d') AS check_in"),
                        db.raw("DATE_FORMAT(survey_headers.check_out, '%Y-%m-%d') AS check_out"),
                        db.raw("DATE_FORMAT(implementation_date, '%Y-%m-%d') AS implementation_date"),
                        db.raw("CASE WHEN survey_headers.is_visited = 1 THEN TRUE ELSE FALSE END AS visit_status"),
                        db.raw("CASE WHEN survey_headers.is_prospect = 1 THEN TRUE WHEN survey_headers.is_prospect = 0 THEN FALSE ELSE NULL END AS prospect_status"),
                        'users.name', 'users.employee_identification_number as nik', 'users.branch_code',
                        'master_identities.full_name as member_fullname', 'master_identities.phone_number as member_phone',
                        'store_locations.province as member_province', 'store_locations.city as member_city',
                        'store_locations.district as member_district', 'store_locations.sub_district as member_sub_district',
                        'store_locations.address as member_address', 'store_locations.postal_code as member_postal_code',
                        'store_locations.customer_type as member_customer_type', 'store_locations.survey_information_source as member_survey_information_source',
                        'store_locations.ownership_status as member_ownership_status', 'store_locations.site_type as member_site_type',
                        'store_locations.length as member_length', 'store_locations.width as member_width',
                        'store_locations.total_floors as member_total_floors', 'store_locations.longitude as member_longitude',
                        'store_locations.latitude as member_latitude', 'store_locations.personnel_status as member_personnel_status',
                        'store_locations.notes as member_notes'
                    )
                    .join('master_survey_types', 'survey_headers.survey_type', 'master_survey_types.id')
                    .join('users', 'users.id', 'survey_headers.implemented_by')
                    .join('store_locations', 'store_locations.id', 'survey_headers.store_location_id')
                    .join('master_identities', 'master_identities.id', 'store_locations.identity_id')
                    .whereIn('survey_headers.id', headerIds)
                    .orderBy('survey_headers.implementation_date', 'desc'),

                db('survey_details')
                    .select(
                        'survey_details.survey_header_id',
                        'master_questions.id as question_id',
                        'master_questions.question_text as question',
                        'master_questions.answer_input_type',
                        'survey_details.answer_text',
                        'master_options.option_label'
                    )
                    .join("master_questions", "master_questions.id", 'survey_details.question_id')
                    .leftJoin('master_options', 'master_options.id', 'survey_details.answer_id')
                    .whereIn('survey_details.survey_header_id', headerIds)
            ]);

            const groupedAnswers = rawAnswers.reduce((acc, answer) => {
                if (!acc[answer.survey_header_id]) acc[answer.survey_header_id] = [];
                acc[answer.survey_header_id].push({
                    question_ids: NodeHashIds.encode(answer.question_id, QUESTION_SECRET_KEY),
                    question: answer.question,
                    answer_input_type: answer.answer_input_type,
                    answer: answer.answer_text || answer.option_label || null
                });
                return acc;
            }, {});

            const data = rawData.map(item => {
                const { header_id, ...rest } = item;
                const headerId = header_id;
                return {
                    ids: NodeHashIds.encode(headerId, LOCATION_SECRET_KEY),
                    ...rest,
                    visit_status: item.visit_status === 1,
                    prospect_status: item.prospect_status === 1 ? true : (item.prospect_status === 0 ? false : null),
                    images: groupedImages[headerId] || [],
                    answers: groupedAnswers[headerId] || []
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get History Survey Location Successfully',
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
}

export default { SurveyController };