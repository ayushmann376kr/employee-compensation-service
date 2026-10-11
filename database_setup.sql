/*
    Employee Compensation Service - database setup
    Run in SQL Server Management Studio (SSMS).

    This script:
      1. Creates EmployeeCompensationDB if it does not exist.
      2. Creates Department and Employee tables if they do not exist.
      3. Inserts sample departments/employees only when Department is empty.

    Review the target SQL Server connection before running.
*/

IF DB_ID(N'EmployeeCompensationDB') IS NULL
BEGIN
    CREATE DATABASE EmployeeCompensationDB;
END;
GO

USE EmployeeCompensationDB;
GO

IF OBJECT_ID(N'dbo.Department', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Department (
        DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentName VARCHAR(100) NOT NULL,
        Location VARCHAR(100) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.Employee', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employee (
        EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        FirstName VARCHAR(50) NOT NULL,
        LastName VARCHAR(50) NOT NULL,
        DepartmentID INT NOT NULL,
        Salary DECIMAL(12,2) NOT NULL,
        Bonus DECIMAL(12,2) NULL,
        HireDate DATE NULL,
        CONSTRAINT FK_Employee_Department
            FOREIGN KEY (DepartmentID) REFERENCES dbo.Department(DepartmentID),
        CONSTRAINT CK_Employee_Salary
            CHECK (Salary >= 0),
        CONSTRAINT CK_Employee_Bonus
            CHECK (Bonus IS NULL OR Bonus >= 0)
    );
END;
GO

/*
    Seed data is inserted only if Department is empty.
    For an existing database that already has sample records, this section
    will not add another copy of the sample data.
*/
IF NOT EXISTS (SELECT 1 FROM dbo.Department)
BEGIN
    SET IDENTITY_INSERT dbo.Department ON;

    INSERT INTO dbo.Department (DepartmentID, DepartmentName, Location)
    VALUES
        (1, 'Engineering', 'Mumbai'),
        (2, 'Human Resources', 'Pune'),
        (3, 'Finance', 'Mumbai'),
        (4, 'Sales', 'Bengaluru');

    SET IDENTITY_INSERT dbo.Department OFF;
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Employee)
BEGIN
    INSERT INTO dbo.Employee
        (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate)
    VALUES
        ('Asha',   'Sharma', 1, 600000.00,  60000.00, '2023-01-15'),
        ('Rahul',  'Verma',  1, 500000.00,      NULL, '2024-03-10'),
        ('Priya',  'Patel',  2, 800000.00, 100000.00, '2022-06-20'),
        ('Amit',   'Singh',  2, 450000.00,      NULL, '2025-02-01'),
        ('Neha',   'Joshi',  3, 900000.00,      NULL, '2021-08-12'),
        ('Karan',  'Mehta',  3, 800000.00, 150000.00, '2022-11-05'),
        ('Riya',   'Desai',  4, 700000.00,  50000.00, '2024-07-01'),
        ('Vikram', 'Rao',    4, 550000.00,      NULL, '2025-01-10');
END;
GO

-- Verification queries
SELECT DepartmentID, DepartmentName, Location
FROM dbo.Department
ORDER BY DepartmentID;

SELECT EmployeeID, FirstName, LastName, DepartmentID, Salary, Bonus, HireDate
FROM dbo.Employee
ORDER BY EmployeeID;

SELECT COALESCE(SUM(Bonus), 0) AS TotalBonus
FROM dbo.Employee;
GO
