import dotenv from 'dotenv';
dotenv.config();

export default {
    development: {
        client: process.env.DB_DEV_CLIENT,
        connection: {
            host: process.env.DB_DEV_HOST,
            port: process.env.DB_DEV_PORT,
            user: process.env.DB_DEV_USER,
            password: process.env.DB_DEV_PASSWORD,
            database: process.env.DB_DEV_DATABASE,
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
        },
        imagePathPrefix: process.env.PATH_AWS_S3_DEV,
    },

    staging: {
        client: process.env.DB_STAGING_CLIENT,
        connection: {
            host: process.env.DB_STAGING_HOST,
            port: process.env.DB_STAGING_PORT,
            user: process.env.DB_STAGING_USER,
            password: process.env.DB_STAGING_PASSWORD,
            database: process.env.DB_STAGING_DATABASE,
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
        },
        imagePathPrefix: process.env.PATH_AWS_S3_STAGING,
    },

    production: {
        client: process.env.DB_PROD_CLIENT,
        connection: {
            host: process.env.DB_PROD_HOST,
            port: process.env.DB_PROD_PORT,
            user: process.env.DB_PROD_USER,
            password: process.env.DB_PROD_PASSWORD,
            database: process.env.DB_PROD_DATABASE,
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
        },
        imagePathPrefix: process.env.PATH_AWS_S3_PROD,
    }
};