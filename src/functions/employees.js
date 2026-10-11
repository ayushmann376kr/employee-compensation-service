
const { app } = require("@azure/functions");
const sql = require("mssql");
const { getPool } = require("../db");

function validateEmployee(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Request body must be a JSON object.";
    }

    const { firstName, lastName, departmentId, salary } = body;
    const bonus = body.bonus === undefined ? null : body.bonus;
    const hireDate = body.hireDate === undefined ? null : body.hireDate;

    if (
        typeof firstName !== "string" ||
        !firstName.trim() ||
        firstName.trim().length > 50 ||
        typeof lastName !== "string" ||
        !lastName.trim() ||
        lastName.trim().length > 50
    ) {
        return "firstName and lastName are required and must not exceed 50 characters.";
    }

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return "departmentId must be a positive integer.";
    }

    if (
        typeof salary !== "number" ||
        !Number.isFinite(salary) ||
        salary < 0 ||
        salary > 9999999999.99
    ) {
        return "salary must be a valid non-negative number.";
    }

    if (
        bonus !== null &&
        (
            typeof bonus !== "number" ||
            !Number.isFinite(bonus) ||
            bonus < 0 ||
            bonus > 9999999999.99
        )
    ) {
        return "bonus must be null or a valid non-negative number.";
    }

    if (
        hireDate !== null &&
        (
            typeof hireDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(hireDate) ||
            !Number.isFinite(Date.parse(hireDate)) ||
            new Date(hireDate).toISOString().slice(0, 10) !== hireDate
        )
    ) {
        return "hireDate must be null or a valid date in YYYY-MM-DD format.";
    }

    return null;
}

// GET /api/employees
// GET /api/employees?departmentId=1
app.http("getEmployees", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "employees",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const departmentId = request.query.get("departmentId");
            const dbRequest = pool.request();

            let query = `
                SELECT EmployeeID, FirstName, LastName,
                       DepartmentID, Salary, Bonus, HireDate
                FROM Employee
            `;

            if (departmentId !== null) {
                const id = Number(departmentId);

                if (!Number.isInteger(id) || id <= 0) {
                    return {
                        status: 400,
                        jsonBody: {
                            message: "departmentId must be a positive integer."
                        }
                    };
                }

                query += " WHERE DepartmentID = @departmentId";
                dbRequest.input("departmentId", sql.Int, id);
            }

            query += " ORDER BY EmployeeID";

            const result = await dbRequest.query(query);
            return { status: 200, jsonBody: result.recordset };
        } catch (error) {
            context.error("Failed to retrieve employees:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to retrieve employees." }
            };
        }
    }
});

// GET /api/employees/{id}
app.http("getEmployeeById", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "employees/{id:int}",
    handler: async (request, context) => {
        try {
            const id = Number(request.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "Employee ID must be a positive integer."
                    }
                };
            }

            const pool = await getPool();
            const result = await pool.request()
                .input("id", sql.Int, id)
                .query(`
                    SELECT EmployeeID, FirstName, LastName,
                           DepartmentID, Salary, Bonus, HireDate
                    FROM Employee
                    WHERE EmployeeID = @id
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { message: "Employee not found." }
                };
            }

            return { status: 200, jsonBody: result.recordset[0] };
        } catch (error) {
            context.error("Failed to retrieve employee:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to retrieve employee." }
            };
        }
    }
});

// POST /api/employees
app.http("createEmployee", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "employees",
    handler: async (request, context) => {
        try {
            let body;

            try {
                body = await request.json();
            } catch {
                return {
                    status: 400,
                    jsonBody: { message: "Request body must contain valid JSON." }
                };
            }

            const validationError = validateEmployee(body);

            if (validationError) {
                return {
                    status: 400,
                    jsonBody: { message: validationError }
                };
            }

            const pool = await getPool();
            const result = await pool.request()
                .input("firstName", sql.VarChar(50), body.firstName.trim())
                .input("lastName", sql.VarChar(50), body.lastName.trim())
                .input("departmentId", sql.Int, body.departmentId)
                .input("salary", sql.Decimal(12, 2), body.salary)
                .input("bonus", sql.Decimal(12, 2),
                    body.bonus === undefined ? null : body.bonus)
                .input("hireDate", sql.Date,
                    body.hireDate === undefined ? null : body.hireDate)
                .query(`
                    INSERT INTO Employee
                        (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate)
                    OUTPUT INSERTED.EmployeeID, INSERTED.FirstName,
                           INSERTED.LastName, INSERTED.DepartmentID,
                           INSERTED.Salary, INSERTED.Bonus, INSERTED.HireDate
                    VALUES
                        (@firstName, @lastName, @departmentId,
                         @salary, @bonus, @hireDate)
                `);

            return {
                status: 201,
                jsonBody: {
                    message: "Employee created successfully.",
                    employee: result.recordset[0]
                }
            };
        } catch (error) {
            if (error.number === 547) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "The specified department does not exist."
                    }
                };
            }

            context.error("Failed to create employee:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to create employee." }
            };
        }
    }
});

// PUT /api/employees/{id}
app.http("updateEmployee", {
    methods: ["PUT"],
    authLevel: "anonymous",
    route: "employees/{id:int}",
    handler: async (request, context) => {
        try {
            const id = Number(request.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "Employee ID must be a positive integer."
                    }
                };
            }

            let body;

            try {
                body = await request.json();
            } catch {
                return {
                    status: 400,
                    jsonBody: { message: "Request body must contain valid JSON." }
                };
            }

            const validationError = validateEmployee(body);

            if (validationError) {
                return {
                    status: 400,
                    jsonBody: { message: validationError }
                };
            }

            const pool = await getPool();
            const result = await pool.request()
                .input("id", sql.Int, id)
                .input("firstName", sql.VarChar(50), body.firstName.trim())
                .input("lastName", sql.VarChar(50), body.lastName.trim())
                .input("departmentId", sql.Int, body.departmentId)
                .input("salary", sql.Decimal(12, 2), body.salary)
                .input("bonus", sql.Decimal(12, 2),
                    body.bonus === undefined ? null : body.bonus)
                .input("hireDate", sql.Date,
                    body.hireDate === undefined ? null : body.hireDate)
                .query(`
                    UPDATE Employee
                    SET FirstName = @firstName,
                        LastName = @lastName,
                        DepartmentID = @departmentId,
                        Salary = @salary,
                        Bonus = @bonus,
                        HireDate = @hireDate
                    OUTPUT INSERTED.EmployeeID, INSERTED.FirstName,
                           INSERTED.LastName, INSERTED.DepartmentID,
                           INSERTED.Salary, INSERTED.Bonus, INSERTED.HireDate
                    WHERE EmployeeID = @id
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { message: "Employee not found." }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    message: "Employee updated successfully.",
                    employee: result.recordset[0]
                }
            };
        } catch (error) {
            if (error.number === 547) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "The specified department does not exist."
                    }
                };
            }

            context.error("Failed to update employee:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to update employee." }
            };
        }
    }
});

// DELETE /api/employees/{id}
app.http("deleteEmployee", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    route: "employees/{id:int}",
    handler: async (request, context) => {
        try {
            const id = Number(request.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "Employee ID must be a positive integer."
                    }
                };
            }

            const pool = await getPool();

            const result = await pool.request()
                .input("id", sql.Int, id)
                .query(`
                    DELETE FROM Employee
                    OUTPUT DELETED.EmployeeID,
                           DELETED.FirstName,
                           DELETED.LastName
                    WHERE EmployeeID = @id
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { message: "Employee not found." }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    message: "Employee deleted successfully.",
                    employee: result.recordset[0]
                }
            };
        } catch (error) {
            context.error("Failed to delete employee:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to delete employee." }
            };
        }
    }
});
