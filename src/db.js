
const sql = require("mssql");

const requiredEnvVars = [
    "DB_SERVER",
    "DB_DATABASE",
    "DB_USER",
    "DB_PASSWORD"
];

const missingEnvVars = requiredEnvVars.filter(
    (name) => !process.env[name] || !process.env[name].trim()
);

if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required database environment variables: ${missingEnvVars.join(", ")}`
    );
}

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate:
            process.env.DB_TRUST_SERVER_CERTIFICATE === "true"
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise;

async function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(config).catch((error) => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
}

module.exports = {
    sql,
    getPool
};
