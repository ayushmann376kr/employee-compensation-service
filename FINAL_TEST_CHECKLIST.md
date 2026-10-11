# Final API Verification Checklist

Base URL: `http://localhost:7071`

## Utility endpoints
- [ ] `GET /api/health` → successful response
- [ ] `GET /api/db-test` → database connection succeeds

## Employee CRUD
- [ ] `POST /api/employees` with valid JSON → creates an employee; record the returned ID
- [ ] `GET /api/employees/{id}` → returns the created employee
- [ ] `GET /api/employees` → returns employee list
- [ ] `GET /api/employees?departmentId=1` → filters by department
- [ ] `PUT /api/employees/{id}` with valid JSON → updates the employee
- [ ] `DELETE /api/employees/{id}` → deletes the employee
- [ ] `GET /api/employees/{deleted-id}` → returns not found
- [ ] Submit invalid data (e.g. missing required name or negative salary) → appropriate client error
- [ ] Request a nonexistent employee ID → `404 Not Found`

## Reports
- [ ] `GET /api/reports/total-bonus`
- [ ] `GET /api/reports/no-bonus`
- [ ] `GET /api/reports/bonus-percentages`
- [ ] `GET /api/reports/departments-high-bonus`
- [ ] `GET /api/reports/bonus-ranking`
- [ ] `GET /api/reports/highest-salary-compensation`

## Clean-start test
- [ ] Stop the local Functions host with `Ctrl+C`
- [ ] Start it again using `func start`
- [ ] Retest `/api/health` and `/api/db-test`
- [ ] Confirm all report endpoints still return successfully

## Before publishing to Git
- [ ] `local.settings.json` is excluded by `.gitignore`
- [ ] No SQL password or other credential is hardcoded in source files
- [ ] Do not commit `.env` files, access tokens, or connection strings containing passwords
- [ ] `README.md`, `database_setup.sql`, `package.json`, and `package-lock.json` are included
