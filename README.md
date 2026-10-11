# Employee Compensation Service

A REST API built with **Node.js**, **Azure Functions v4**, and **Microsoft SQL Server** for managing employees and generating compensation reports.

## Features

### Employee APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/employees` | Create an employee |
| `GET` | `/api/employees` | Retrieve all employees |
| `GET` | `/api/employees?departmentId=1` | Filter employees by department |
| `GET` | `/api/employees/{id}` | Retrieve an employee by ID |
| `PUT` | `/api/employees/{id}` | Update an employee |
| `DELETE` | `/api/employees/{id}` | Delete an employee |

### Reporting APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/total-bonus` | Sum employee bonuses, treating NULL bonuses as zero |
| `GET` | `/api/reports/no-bonus` | List employees whose bonus is `NULL` |
| `GET` | `/api/reports/bonus-percentages` | Calculate bonus as a percentage of salary for employees with a bonus |
| `GET` | `/api/reports/departments-high-bonus` | Find departments where total bonus exceeds average employee salary |
| `GET` | `/api/reports/bonus-ranking` | Rank employees by bonus, with `NULL` bonuses last |
| `GET` | `/api/reports/highest-salary-compensation` | Compare the highest base-salary employee with the highest total-compensation employee |

### Utility APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Application health check |
| `GET` | `/api/db-test` | Database connectivity test |

## Technology

- Node.js and JavaScript
- Azure Functions v4 programming model
- Microsoft SQL Server
- `mssql` Node.js package
- Postman for API testing

## Prerequisites

Install the following on your development machine:

1. Node.js (a current supported LTS release is recommended).
2. Azure Functions Core Tools v4.
3. Microsoft SQL Server Developer/Express or another compatible SQL Server instance.
4. SQL Server Management Studio (SSMS), or an equivalent SQL client.
5. Git (optional).

## Project setup

### 1. Create the database

Open SQL Server Management Studio and connect to your SQL Server instance. Open and execute [`database_setup.sql`](database_setup.sql). The script creates `EmployeeCompensationDB`, the `Department` and `Employee` tables, their constraints, and sample records.

If your SQL Server instance uses a different name, note it for the `DB_SERVER` setting below.

### 2. Install Node dependencies

Open a terminal in the project root (the directory containing `package.json`) and run:

```powershell
npm install
```

If the `mssql` package is not already in `package.json`, install it with:

```powershell
npm install mssql
```

### 3. Configure local settings

Create `local.settings.json` in the project root for local development. Do **not** commit this file because it can contain credentials.

Example structure (replace the placeholder values locally):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DB_SERVER": "localhost",
    "DB_DATABASE": "EmployeeCompensationDB",
    "DB_USER": "YOUR_SQL_LOGIN",
    "DB_PASSWORD": "YOUR_SQL_PASSWORD",
    "DB_ENCRYPT": "false",
    "DB_TRUST_SERVER_CERTIFICATE": "true"
  }
}
```

Use the exact environment variable names referenced by `src/db.js`. For a local SQL Server Developer Edition instance, the server may be `localhost`; use the server/instance configuration that works on your machine. If you use a named instance, configure SQL Server TCP/IP and specify the appropriate server and port/instance format supported by your SQL Server setup.

`AzureWebJobsStorage` may require Azurite or another configured storage emulator depending on your local Functions setup. If your current local setup already starts successfully, retain the settings that work for your machine.

**Security:** Use a dedicated least-privilege SQL login for the application. Never paste credentials into source code or commit them to Git. In production, configure environment variables/app settings in the hosting platform and use secure secret storage.

### 4. Start the Functions host

From the project root, run:

```powershell
func start
```

The local base URL is normally:

```text
http://localhost:7071
```

Keep the terminal open while testing with Postman.

## Postman examples

Set the method and URL as shown below. For POST and PUT, choose **Body → raw → JSON** and set the content type to `application/json`.

### Create an employee

`POST http://localhost:7071/api/employees`

```json
{
  "firstName": "Test",
  "lastName": "Employee",
  "departmentId": 1,
  "salary": 500000,
  "bonus": null,
  "hireDate": "2025-01-15"
}
```

Use the `EmployeeID` returned by the API for the subsequent GET, PUT, and DELETE requests. Do not assume the ID will always be the same.

### Update an employee

`PUT http://localhost:7071/api/employees/ID`

```json
{
  "firstName": "Updated",
  "lastName": "Employee",
  "departmentId": 1,
  "salary": 525000,
  "bonus": 25000,
  "hireDate": "2025-01-15"
}
```

Replace `ID` with an existing employee ID. Match the property names and validation rules implemented in `src/functions/employees.js`.

### Get employees in a department

`GET http://localhost:7071/api/employees?departmentId=1`

### Test a report

`GET http://localhost:7071/api/reports/total-bonus`

Try the other report URLs from the Reporting APIs table above.

## Database design

### Department

- `DepartmentID`: identity primary key
- `DepartmentName`: required, up to 100 characters
- `Location`: optional, up to 100 characters

### Employee

- `EmployeeID`: identity primary key
- `FirstName`, `LastName`: required
- `DepartmentID`: required foreign key to `Department`
- `Salary`: required decimal value, constrained to be non-negative
- `Bonus`: nullable decimal value, constrained to be non-negative when supplied
- `HireDate`: optional date

A `NULL` bonus is intentionally preserved in the database. Reports use `COALESCE` only where the business logic requires a missing bonus to count as zero.

## Validation and error handling

The employee endpoints validate request data and use parameterized SQL queries. Expected behavior includes:

- `400 Bad Request` for invalid input or invalid department references where handled by the API.
- `404 Not Found` when an employee ID does not exist.
- Successful status codes for completed operations (for example, `200` or `201`, according to the endpoint implementation).
- `500 Internal Server Error` for unexpected server/database failures, with a sanitized response rather than internal connection details.

Check the actual status and response body from your implementation during testing.

## Final test checklist

- [ ] `GET /api/health` responds successfully.
- [ ] `GET /api/db-test` confirms database connectivity.
- [ ] Create an employee with valid data.
- [ ] Retrieve the new employee by ID.
- [ ] Retrieve all employees and filter by department.
- [ ] Update the employee.
- [ ] Delete the employee and verify it is no longer found.
- [ ] Test invalid input and a nonexistent employee ID.
- [ ] Run all six reporting endpoints.
- [ ] Stop and restart `func start`, then repeat a health and database check.
- [ ] Confirm `local.settings.json` is ignored by Git and no secrets are committed.

## Suggested repository structure

```text
Employee Compensation Service/
├── src/
│   ├── db.js
│   └── functions/
│       ├── health.js
│       ├── db-test.js
│       ├── employees.js
│       └── reports.js
├── database_setup.sql
├── .gitignore
├── host.json
├── package.json
├── package-lock.json
└── README.md
```

Your actual project may contain additional files; retain files required by your local Azure Functions setup.
