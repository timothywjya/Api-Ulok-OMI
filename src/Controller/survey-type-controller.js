import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { CustomError } from '../Error/error-handling.js';
import NodeHashIds from '../Utils/Hashids.js';
dotenv.config();
const db = knex(knexConfig[process.env.NODE_ENV]);

export class SurveyTypeController {
    static async getDataSurveyType(req, res, next) {
        const SURVEY_TYPE_SECRET_KEY = process.env.SURVEY_TYPE_SECRET_KEY;

        try {
            const rawData = await db('master_survey_types')
                .select(
                    'id',
                    'survey_type'
                )

            const data = rawData.map(item => {
                const {
                    id,
                    ...rest
                } = item;

                return {
                    ids: NodeHashIds.encode(id, SURVEY_TYPE_SECRET_KEY),
                    ...rest
                };
            });

            res.status(200).json({
                status: 'Success',
                status_code: '200',
                message: 'Get Data Survey Type Sucessfully',
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

export default { SurveyTypeController };