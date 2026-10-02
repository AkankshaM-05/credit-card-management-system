CREATE TABLE CUSTOMER (
    Customer_ID VARCHAR(10) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15),
    Email VARCHAR(100) UNIQUE
);


CREATE TABLE STAFF_USER (
    Staff_ID VARCHAR(10) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL,

    CHECK (Role IN ('EMPLOYEE', 'MANAGER'))
);


CREATE TABLE USER_ACCOUNT (
    User_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,

    User_Type VARCHAR(20) NOT NULL,

    Customer_ID VARCHAR(10) NULL,
    Staff_ID VARCHAR(10) NULL,

    FOREIGN KEY (Customer_ID)
        REFERENCES CUSTOMER(Customer_ID),

    FOREIGN KEY (Staff_ID)
        REFERENCES STAFF_USER(Staff_ID),

    CHECK (
        User_Type IN (
            'ADMIN',
            'CUSTOMER',
            'EMPLOYEE',
            'MANAGER'
        )
    ),

    CHECK (
        (
            User_Type = 'ADMIN'
            AND Customer_ID IS NULL
            AND Staff_ID IS NULL
        )
        OR
        (
            User_Type = 'CUSTOMER'
            AND Customer_ID IS NOT NULL
            AND Staff_ID IS NULL
        )
        OR
        (
            User_Type IN ('EMPLOYEE', 'MANAGER')
            AND Staff_ID IS NOT NULL
            AND Customer_ID IS NULL
        )
    ),

    UNIQUE (Customer_ID),
    UNIQUE (Staff_ID)
);


CREATE UNIQUE INDEX one_admin_only
ON USER_ACCOUNT (User_Type)
WHERE User_Type = 'ADMIN';


CREATE TABLE MERCHANT (
    Merchant_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Merchant_Name VARCHAR(100) NOT NULL,
    Category VARCHAR(50)
);


CREATE TABLE CREDIT_CARD (
    Card_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    Customer_ID VARCHAR(10) NOT NULL,

    Credit_Limit DECIMAL(12,2) NOT NULL,
    Issue_Date DATE NOT NULL,
    Expiry_Date DATE NOT NULL,

    Status VARCHAR(20) NOT NULL,

    FOREIGN KEY (Customer_ID)
        REFERENCES CUSTOMER(Customer_ID),

    CHECK (Credit_Limit > 0),

    CHECK (Expiry_Date > Issue_Date),

    CHECK (
        Status IN (
            'PENDING_APPROVAL',
            'ACTIVE',
            'BLOCKED',
            'CLOSED'
        )
    )
);


CREATE TABLE CARD_TRANSACTION (
    Transaction_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    Card_ID INT NOT NULL,
    Merchant_ID INT NOT NULL,

    Amount DECIMAL(12,2) NOT NULL,
    Transaction_Date DATE NOT NULL,

    Transaction_Type VARCHAR(20) NOT NULL,

    FOREIGN KEY (Card_ID)
        REFERENCES CREDIT_CARD(Card_ID),

    FOREIGN KEY (Merchant_ID)
        REFERENCES MERCHANT(Merchant_ID),

    CHECK (Amount > 0),

    CHECK (
        Transaction_Type IN (
            'PURCHASE',
            'REFUND',
            'REVERSAL'
        )
    )
);


CREATE TABLE BILLING_STATEMENT (
    Statement_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    Card_ID INT NOT NULL,

    Billing_Start_Date DATE NOT NULL,
    Billing_End_Date DATE NOT NULL,

    Transaction_Amount DECIMAL(12,2) NOT NULL,
    Amount_Paid DECIMAL(12,2) NOT NULL DEFAULT 0,

    Due_Date DATE NOT NULL,

    Status VARCHAR(20) NOT NULL,

    FOREIGN KEY (Card_ID)
        REFERENCES CREDIT_CARD(Card_ID),

    CHECK (Billing_End_Date >= Billing_Start_Date),

    CHECK (Transaction_Amount >= 0),

    CHECK (Amount_Paid >= 0),

    CHECK (Amount_Paid <= Transaction_Amount),

    CHECK (
        Status IN (
            'DUE',
            'PARTIAL',
            'PAID',
            'OVERDUE'
        )
    ),

    UNIQUE (Card_ID, Billing_Start_Date, Billing_End_Date)
);


CREATE TABLE PAYMENT (
    Payment_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    Statement_ID INT NOT NULL,

    Amount_Paid DECIMAL(12,2) NOT NULL,

    Payment_Date DATE NOT NULL,

    Payment_Status VARCHAR(20) NOT NULL,

    FOREIGN KEY (Statement_ID)
        REFERENCES BILLING_STATEMENT(Statement_ID),

    CHECK (Amount_Paid > 0),

    CHECK (
        Payment_Status IN (
            'SUCCESS',
            'FAILED',
            'PENDING'
        )
    )
);


CREATE TABLE AUDIT_LOG (
    Audit_ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    Staff_ID VARCHAR(10) NOT NULL,
    Card_ID INT NOT NULL,

    Action VARCHAR(50) NOT NULL,

    Reason VARCHAR(255),

    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (Staff_ID)
        REFERENCES STAFF_USER(Staff_ID),

    FOREIGN KEY (Card_ID)
        REFERENCES CREDIT_CARD(Card_ID)
);