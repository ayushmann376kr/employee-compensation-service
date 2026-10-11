
const { app } = require("@azure/functions");
const { getPool } = require("../db");

// Default bonus: 5% of salary when Bonus is NULL.
// This is calculated at read time; database records are not modified.
const DEFAULT_BONUS_RATE = 0.05;

// Report 1: Calculate total bonus
app.http("getTotalBonus", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/total-bonus",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                SELECT COALESCE(
                    SUM(COALESCE(Bonus, Salary * ${DEFAULT_BONUS_RATE})),
                    0
                ) AS TotalBonus
                FROM Employee
            `);

            return {
                status: 200,
                jsonBody: {
                    report: "Total Bonus",
                    totalBonus: result.recordset[0].TotalBonus
                }
            };
        } catch (error) {
            context.error("Failed to calculate total bonus:", error.message);
            return {
                status: 500,
                jsonBody: { message: "Unable to calculate total bonus." }
            };
        }
    }
});

// Report 2: Employees whose bonus was not explicitly assigned
app.http("getEmployeesWithNoBonus", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/no-bonus",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                SELECT
                    EmployeeID,
                    FirstName,
                    LastName,
                    DepartmentID,
                    Salary,
                    Bonus,
                    CAST(
                        Salary * ${DEFAULT_BONUS_RATE}
                        AS DECIMAL(19, 2)
                    ) AS CalculatedDefaultBonus,
                    HireDate
                FROM Employee
                WHERE Bonus IS NULL
                ORDER BY EmployeeID
            `);

            return {
                status: 200,
                jsonBody: {
                    report: "Employees with No Assigned Bonus",
                    defaultBonusRate: "5%",
                    count: result.recordset.length,
                    employees: result.recordset
                }
            };
        } catch (error) {
            context.error(
                "Failed to retrieve employees without bonus:",
                error.message
            );
            return {
                status: 500,
                jsonBody: {
                    message: "Unable to retrieve employees without bonus."
                }
            };
        }
    }
});

// Report 3: Bonus as a percentage of salary.
// Employees with NULL Bonus use the 5% default.
app.http("getBonusPercentages", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/bonus-percentages",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                SELECT
                    EmployeeID,
                    FirstName,
                    LastName,
                    Salary,
                    Bonus,
                    COALESCE(
                        Bonus,
                        Salary * ${DEFAULT_BONUS_RATE}
                    ) AS EffectiveBonus,
                    CAST(
                        ROUND(
                            (
                                CAST(
                                    COALESCE(
                                        Bonus,
                                        Salary * ${DEFAULT_BONUS_RATE}
                                    ) AS DECIMAL(19, 4)
                                )
                                / NULLIF(Salary, 0)
                            ) * 100,
                            2
                        ) AS DECIMAL(10, 2)
                    ) AS BonusPercentage
                FROM Employee
                ORDER BY EmployeeID
            `);

            return {
                status: 200,
                jsonBody: {
                    report: "Bonus Percentages",
                    defaultBonusRate: "5%",
                    count: result.recordset.length,
                    employees: result.recordset
                }
            };
        } catch (error) {
            context.error(
                "Failed to calculate bonus percentages:",
                error.message
            );
            return {
                status: 500,
                jsonBody: {
                    message: "Unable to calculate bonus percentages."
                }
            };
        }
    }
});

// Report 4: Departments whose total effective bonus exceeds average salary
app.http("getDepartmentsHighBonus", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/departments-high-bonus",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                SELECT
                    d.DepartmentID,
                    d.DepartmentName,
                    SUM(
                        COALESCE(
                            e.Bonus,
                            e.Salary * ${DEFAULT_BONUS_RATE}
                        )
                    ) AS TotalBonus,
                    AVG(e.Salary) AS AverageSalary
                FROM Department AS d
                INNER JOIN Employee AS e
                    ON d.DepartmentID = e.DepartmentID
                GROUP BY d.DepartmentID, d.DepartmentName
                HAVING
                    SUM(
                        COALESCE(
                            e.Bonus,
                            e.Salary * ${DEFAULT_BONUS_RATE}
                        )
                    ) > AVG(e.Salary)
                ORDER BY d.DepartmentID
            `);

            return {
                status: 200,
                jsonBody: {
                    report: "Departments with High Bonus",
                    defaultBonusRate: "5%",
                    count: result.recordset.length,
                    departments: result.recordset
                }
            };
        } catch (error) {
            context.error(
                "Failed to retrieve high-bonus departments:",
                error.message
            );
            return {
                status: 500,
                jsonBody: {
                    message: "Unable to retrieve high-bonus departments."
                }
            };
        }
    }
});

// Report 5: Rank employees by effective bonus.
// Employees with NULL Bonus receive the 5% default.
app.http("getBonusRanking", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/bonus-ranking",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                SELECT
                    ROW_NUMBER() OVER (
                        ORDER BY
                            COALESCE(
                                Bonus,
                                Salary * ${DEFAULT_BONUS_RATE}
                            ) DESC,
                            EmployeeID
                    ) AS BonusRank,
                    EmployeeID,
                    FirstName,
                    LastName,
                    Salary,
                    Bonus,
                    COALESCE(
                        Bonus,
                        Salary * ${DEFAULT_BONUS_RATE}
                    ) AS EffectiveBonus
                FROM Employee
                ORDER BY
                    EffectiveBonus DESC,
                    EmployeeID
            `);

            return {
                status: 200,
                jsonBody: {
                    report: "Employee Bonus Ranking",
                    defaultBonusRate: "5%",
                    count: result.recordset.length,
                    employees: result.recordset
                }
            };
        } catch (error) {
            context.error(
                "Failed to rank employee bonuses:",
                error.message
            );
            return {
                status: 500,
                jsonBody: {
                    message: "Unable to rank employee bonuses."
                }
            };
        }
    }
});

// Report 6: Compare highest base salary with highest total compensation.
// Total compensation uses the effective bonus, including the 5% default.
app.http("getHighestSalaryCompensation", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "reports/highest-salary-compensation",
    handler: async (request, context) => {
        try {
            const pool = await getPool();
            const result = await pool.request().query(`
                WITH EmployeeCompensation AS (
                    SELECT
                        EmployeeID,
                        FirstName,
                        LastName,
                        Salary,
                        Bonus,
                        COALESCE(
                            Bonus,
                            Salary * ${DEFAULT_BONUS_RATE}
                        ) AS EffectiveBonus,
                        Salary + COALESCE(
                            Bonus,
                            Salary * ${DEFAULT_BONUS_RATE}
                        ) AS TotalCompensation
                    FROM Employee
                ),
                HighestSalary AS (
                    SELECT TOP 1 *
                    FROM EmployeeCompensation
                    ORDER BY Salary DESC, EmployeeID
                ),
                HighestCompensation AS (
                    SELECT TOP 1 *
                    FROM EmployeeCompensation
                    ORDER BY TotalCompensation DESC, EmployeeID
                )
                SELECT
                    hs.EmployeeID AS HighestSalaryEmployeeID,
                    hs.FirstName AS HighestSalaryFirstName,
                    hs.LastName AS HighestSalaryLastName,
                    hs.Salary AS HighestBaseSalary,
                    hs.Bonus AS HighestSalaryEmployeeBonus,
                    hs.EffectiveBonus AS HighestSalaryEmployeeEffectiveBonus,

                    hc.EmployeeID AS HighestCompensationEmployeeID,
                    hc.FirstName AS HighestCompensationFirstName,
                    hc.LastName AS HighestCompensationLastName,
                    hc.Salary AS HighestCompensationBaseSalary,
                    hc.Bonus AS HighestCompensationBonus,
                    hc.EffectiveBonus AS HighestCompensationEffectiveBonus,
                    hc.TotalCompensation AS HighestTotalCompensation,

                    CAST(
                        CASE
                            WHEN hs.EmployeeID = hc.EmployeeID THEN 1
                            ELSE 0
                        END AS BIT
                    ) AS IsSameEmployee
                FROM HighestSalary AS hs
                CROSS JOIN HighestCompensation AS hc
            `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { message: "No employees found." }
                };
            }

            const row = result.recordset[0];

            return {
                status: 200,
                jsonBody: {
                    report: "Highest Salary vs Highest Total Compensation",
                    defaultBonusRate: "5%",
                    highestBaseSalaryEmployee: {
                        employeeID: row.HighestSalaryEmployeeID,
                        firstName: row.HighestSalaryFirstName,
                        lastName: row.HighestSalaryLastName,
                        salary: row.HighestBaseSalary,
                        bonus: row.HighestSalaryEmployeeBonus,
                        effectiveBonus: row.HighestSalaryEmployeeEffectiveBonus
                    },
                    highestTotalCompensationEmployee: {
                        employeeID: row.HighestCompensationEmployeeID,
                        firstName: row.HighestCompensationFirstName,
                        lastName: row.HighestCompensationLastName,
                        salary: row.HighestCompensationBaseSalary,
                        bonus: row.HighestCompensationBonus,
                        effectiveBonus: row.HighestCompensationEffectiveBonus,
                        totalCompensation: row.HighestTotalCompensation
                    },
                    isSameEmployee: row.IsSameEmployee
                }
            };
        } catch (error) {
            context.error(
                "Failed to compare salary and compensation:",
                error.message
            );
            return {
                status: 500,
                jsonBody: {
                    message: "Unable to compare salary and total compensation."
                }
            };
        }
    }
});
