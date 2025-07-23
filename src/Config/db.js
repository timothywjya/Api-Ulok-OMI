import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';

const mysqlConfig = {
    development: {
        client: process.env.DB_DEV_CLIENT,
        connection: {
            host: process.env.DB_DEV_HOST,
            port: process.env.DB_DEV_PORT,
            user: process.env.DB_DEV_USER,
            password: process.env.DB_DEV_PASSWORD,
            database: process.env.DB_DEV_DATABASE,
        },
        pool: {
            min: 2,
            max: 10
        }
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
        pool: {
            min: 2,
            max: 10
        }
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
        pool: {
            min: 2,
            max: 10
        }
    }
};

const oracleIgrCrmConfig = {
    client: "oracledb",
    connection: {
        user: "igrcrm",
        password: "igrcrm",
        connectString: "172.20.22.93:1521/igrcrm",
    },
    pool: {
        min: 2,
        max: 10
    }
};

const oracleSimcklConfig = {
    client: "oracledb",
    connection: {
        user: "simckl",
        password: "simckl",
        connectString: "192.168.249.193:1521/simckl",
    },
    pool: {
        min: 2,
        max: 10
    }
};

const db = knex(mysqlConfig[environment]);

export function getOracleKnex(dbName) {
    let config;
    switch (dbName) {
        case 'igrcrm':
            config = oracleIgrCrmConfig;
            break;
        case 'simckl':
            config = oracleSimcklConfig;
            break;
        default:
            throw new Error(`Oracle database configuration for '${dbName}' not found. Available: 'igrcrm', 'simckl'.`);
    }
    return knex(config);
}

export default db;