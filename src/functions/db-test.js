
const { app } = require("@azure/functions");
const { getPool } = require("../db");

app.http("dbTest", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "db-test",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(
                "SELECT DB_NAME() AS databaseName"
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Database connection successful!",
                    database: result.recordset[0].databaseName
                }
            };
        } catch (error) {
            context.error("Database connection failed:", error.message);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: "Database connection failed. Check the application logs."
                }
            };
        }
    }
});
