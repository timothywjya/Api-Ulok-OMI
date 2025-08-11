import Joi from 'joi';

export const recommendedLocationValidation = Joi.object({
    longitude: Joi.number()
        .min(-180)
        .max(180)
        .required()
        .messages({
            'any.required': 'Longitude is required.',
            'number.base': 'Longitude must be a number.',
            'number.min': 'Longitude must be between -180 and 180.',
            'number.max': 'Longitude must be between -180 and 180.',
        }),

    latitude: Joi.number()
        .min(-90)
        .max(90)
        .required()
        .messages({
            'any.required': 'Latitude is required.',
            'number.base': 'Latitude must be a number.',
            'number.min': 'Latitude must be between -90 and 90.',
            'number.max': 'Latitude must be between -90 and 90.',
        }),

    province: Joi.string().required().messages({
        'any.required': 'Province is required.',
        'string.empty': 'Province cannot be empty.',
    }),

    city: Joi.string().required().messages({
        'any.required': 'City is required.',
        'string.empty': 'City cannot be empty.',
    }),

    district: Joi.string().required().messages({
        'any.required': 'District is required.',
        'string.empty': 'District cannot be empty.',
    }),

    sub_district: Joi.string().required().messages({
        'any.required': 'Sub-district is required.',
        'string.empty': 'Sub-district cannot be empty.',
    }),

    postal_code: Joi.string().length(5).required().messages({
        'any.required': 'Postal code is required.',
        'string.empty': 'Postal code cannot be empty.',
        'string.length': 'Postal code must be exactly 5 digits.',
    }),

    address: Joi.string().required().messages({
        'any.required': 'Address is required.',
        'string.empty': 'Address cannot be empty.',
    }),

    keterangan: Joi.string().required().messages({
        'any.required': 'Keterangan is required.',
        'string.empty': 'Keterangan cannot be empty.',
    }),
});