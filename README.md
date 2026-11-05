# Credit Card Account Management and Risk-Control System

A web-based credit card management and banking operations portal developed with **Next.js**, **React**, **TypeScript**, **PostgreSQL**, and **Tailwind CSS**. The system enables retail banks to manage customer credit accounts, process transactions, generate recurring weekly billing statements, track payments, log administrative actions, and evaluate credit risk.

---

## Table of Contents

- [1. About the Project](#1-about-the-project)
- [2. Problem Statement](#2-problem-statement)
- [3. Key Features](#3-key-features)
- [4. User Roles & Access Control](#4-user-roles--access-control)
- [5. Technology Stack](#5-technology-stack)
- [6. Application Architecture & Workflow](#6-application-architecture--workflow)
- [7. Database Overview](#7-database-overview)
- [8. Risk Analysis Module](#8-risk-analysis-module)
- [9. Project Structure](#9-project-structure)
- [10. Installation and Setup](#10-installation-and-setup)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Setup](#step-by-step-setup)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [11. Key API Endpoints](#11-key-api-endpoints)
- [12. Limitations & Future Scope](#12-limitations--future-scope)

---

## 1. About the Project

The **Credit Card Account Management and Risk-Control System** is an academic software project that simulates the operational workflow of a retail bank's credit card division. 

It provides dedicated web interfaces for four types of users—**Administrators**, **Employees**, **Managers**, and **Customers**—allowing the bank to streamline card issuance, log day-to-day transactions, automate weekly billing statements, and monitor accounts that show signs of financial delinquency.

---

## 2. Problem Statement

Commercial credit card operations require coordination across multiple departments:
- **Card Issuance & Approval:** New credit lines must be requested by staff and vetted by managers before activation.
- **Credit Limit Control:** Cardholders must be prevented from spending beyond their available credit limit.
- **Predictable Billing:** Cardholders need regular, itemized billing statements with clear due dates and payment tracking.
- **Risk Identification:** Banks must detect customers who accumulate debt, fail to make minimum payments, or repeatedly miss due dates.

This project delivers a unified web application that manages these requirements through role-based dashboards, recurring billing cycles, and automated risk scoring.

---

## 3. Key Features

- **Role-Based Access Control:** Secure authentication for four user roles (`ADMIN`, `EMPLOYEE`, `MANAGER`, `CUSTOMER`) using encrypted passwords and JWT session cookies.
- **User Provisioning:** Administrators can register new customers and internal staff members with auto-generated unique IDs (`CUS...`, `EMP...`, `MGR...`).
- **Customer Lookup:** Debounced live search allowing bank staff to find customer accounts quickly by Customer ID.
- **Card Lifecycle Management:** Controlled card status transitions:
  $$\text{Pending Approval} \longrightarrow \text{Active} \longrightarrow \text{Blocked} \longrightarrow \text{Closed}$$
- **Transaction Entry:** Employees can record purchases, refunds, and reversals against registered merchants, with automatic checks against the card's available credit.
- **Automated 7-Day Weekly Billing:** Billing statements are automatically generated in 7-day cycles anchored to each card's issue date, with payment due dates set 15 days after the cycle ends.
- **Payment Reconciliation:** Employees can record customer payments against billing statements, automatically advancing statements to `PAID`, `PARTIAL`, or `OVERDUE`.
- **Bulk Excel Import:** Employees and managers can batch-import transactions and payments by uploading `.xlsx` or `.csv` spreadsheets.
- **Rule-Based Risk Scoring:** Real-time risk analysis categorizing active cards into `HIGH`, `MEDIUM`, or `LOW` risk tiers based on credit utilization and payment behavior.
- **Email Notifications & Scheduled Jobs:** Automated daily cron job that generates due billing statements and sends payment reminder emails to customers via Gmail SMTP.
- **Audit Action Trail:** Automatically records staff interventions (approvals, card blocks, account closures) in an audit log.

---

## 4. User Roles & Access Control

| Role | Primary Responsibilities | Accessible Views |
| :--- | :--- | :--- |
| **Admin** | System setup, provisioning customer accounts, creating employee and manager accounts, viewing system-wide account totals. | `/admin`, `/admin/customers`, `/admin/staff` |
| **Employee** | Searching customer profiles, requesting new credit cards, recording single transactions/payments, uploading Excel sheets. | `/employee`, `/employee/cards/new`, `/employee/transactions/new`, `/employee/payments/new` |
| **Manager** | Reviewing and approving pending cards, blocking or closing accounts, monitoring portfolio risk analysis, reviewing customer accounts. | `/manager`, `/manager/customers`, `/manager/cards/[cardId]` |
| **Customer** | Viewing personal account details, issued credit cards, transaction histories, billing statements, and payment receipts (read-only). | `/customer`, `/customer/cards/[cardId]` |

---

## 5. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4 | Responsive dashboard UI, forms, modal dialogs, and dynamic tables |
| **Backend** | Next.js API Routes (Node.js), TypeScript | Server-side REST endpoints, request validation, and domain logic |
| **Database** | PostgreSQL (hosted on Neon) | Relational database engine for persistent data storage |
| **Database Client** | `pg` (Node-Postgres) | Connection pool management and SQL query execution |
| **Authentication** | `jose` (JWT), `bcrypt` | Stateless session management via HTTP-only cookies and password hashing |
| **Spreadsheet Ingestion** | SheetJS (`xlsx`) | Upload and parsing of `.xlsx`, `.xls`, and `.csv` batch files |
| **Email Service** | Nodemailer | HTML email dispatching for billing reminders and overdue alerts |
| **Task Scheduling** | Vercel Cron | Automated daily job triggering billing statement generation |

---

## 6. Application Architecture & Workflow

### High-Level Architecture

```mermaid
flowchart TD
    subgraph Client["Presentation Layer (Next.js / React)"]
        AdminView["Admin Dashboard"]
        EmpView["Employee Dashboard"]
        MgrView["Manager Dashboard"]
        CustView["Customer Dashboard"]
    end

    subgraph API["Backend API Layer (Next.js App Router)"]
        AuthRoutes["/api/auth/*"]
        CardRoutes["/api/cards"]
        TxnRoutes["/api/transactions"]
        BillRoutes["/api/billing"]
        PayRoutes["/api/payments"]
        RiskRoutes["/api/risk-analysis"]
        AccountRoutes["/api/customers & /api/staff"]
    end

    subgraph Database["Database Layer"]
        DB[("PostgreSQL Database (Neon)")]
    end

    subgraph External["External Services"]
        CronService["Vercel Cron (Daily)"]
        SMTPServer["Gmail SMTP Server"]
    end

    Client -->|HTTP Requests / Session Cookies| API
    API -->|SQL Queries & Transactions| DB
    CronService -->|Scheduled Webhook| BillRoutes
    API -->|Email Dispatch via Nodemailer| SMTPServer
```

### End-to-End Operational Lifecycle

```mermaid
flowchart LR
    A["1. Admin creates Customer & Staff"] --> B["2. Employee requests Credit Card"]
    B --> C["3. Manager approves Card (ACTIVE)"]
    C --> D["4. Employee records Transactions"]
    D --> E["5. System generates 7-Day Bill"]
    E --> F["6. Employee logs Payment"]
    C --> G["7. Manager checks Risk Analysis"]
    G -->|Delinquent| H["8. Manager Blocks Card"]
```

---

## 7. Database Overview

The project uses PostgreSQL with 9 relational tables to manage banking entities:

| Table | Description |
| :--- | :--- |
| **`CUSTOMER`** | Stores customer identity information (name, phone number, email address). |
| **`STAFF_USER`** | Stores bank staff details and designates their role as `EMPLOYEE` or `MANAGER`. |
| **`USER_ACCOUNT`** | Stores login credentials (username, bcrypt password hash) and links to customer or staff profiles. |
| **`MERCHANT`** | Catalog of registered vendors (e.g., Amazon, Apple, Uber) and business categories. |
| **`CREDIT_CARD`** | Stores issued credit cards, assigned credit limits, issue/expiry dates, and lifecycle statuses. |
| **`CARD_TRANSACTION`** | Ledger of all card activity, supporting `PURCHASE`, `REFUND`, and `REVERSAL` transaction types. |
| **`BILLING_STATEMENT`** | Invoices generated for 7-day billing periods, recording total amounts due, amounts paid, and due dates. |
| **`PAYMENT`** | Records payment receipts credited against specific billing statements. |
| **`AUDIT_LOG`** | Action log tracking staff members who approved, blocked, or closed credit cards. |

---

## 8. Risk Analysis Module

To assist managers in identifying credit risk, the application computes financial risk metrics across all active and blocked cards.

### Core Metrics

- **Net Transactions:** Total purchases minus refunds and reversals.
- **Outstanding Balance:** Net transactions minus total successful payments.
- **Credit Utilization (%):** Percentage of the card's credit limit currently in use:
  $$\text{Utilization} = \left(\frac{\text{Outstanding Balance}}{\text{Credit Limit}}\right) \times 100$$
- **Payment Ratio (%):** Percentage of total spend that has been paid off:
  $$\text{Payment Ratio} = \left(\frac{\text{Total Paid}}{\text{Net Transactions}}\right) \times 100$$
- **Overdue Rate (%):** Percentage of billing statements that have reached `OVERDUE` status:
  $$\text{Overdue Rate} = \left(\frac{\text{Overdue Statements}}{\text{Total Statements}}\right) \times 100$$
- **Partial Payment Rate (%):** Percentage of statements paid partially:
  $$\text{Partial Rate} = \left(\frac{\text{Partial Statements}}{\text{Total Statements}}\right) \times 100$$

### Risk Classification Tiers

| Tier | Evaluation Criteria | Operational Meaning |
| :--- | :--- | :--- |
| **HIGH** | - Outstanding balance exists with zero total payments made, OR<br>- Credit utilization exceeds 70% accompanied by an overdue rate $> 20\%$ or partial payment rate $> 30\%$. | Severe risk of debt default; candidate for card blocking. |
| **MEDIUM** | Not HIGH, and meets any of the following:<br>- Overdue rate $> 20\%$<br>- Partial payment rate $> 30\%$<br>- Payment ratio $< 70\%$ | Moderate delinquency; requires monitoring. |
| **LOW** | Normal credit utilization and consistent payment history. | Account in good standing. |

*Note: The risk analysis module is a deterministic, rule-based evaluation tool based on financial formulas, not a machine learning model.*

---

## 9. Project Structure

```
credit-card-app/
├── app/                               # Next.js App Router
│   ├── admin/                         # Admin portal (system overview, account creation)
│   ├── customer/                      # Customer portal (profile, cards, statements)
│   ├── employee/                      # Employee portal (search, cards, transactions, payments)
│   ├── manager/                       # Manager portal (approvals, risk analysis, card review)
│   ├── login/                         # Unified login page for all roles
│   └── api/                           # Backend REST API route handlers
│       ├── auth/                      # Login, logout, session verification
│       ├── cards/                     # Card creation, approval, and status controls
│       ├── customers/                 # Customer registration and live search
│       ├── staff/                     # Staff user registration
│       ├── transactions/              # Single transaction entry and Excel import
│       ├── billing/                   # Statement retrieval and cron execution
│       ├── payments/                  # Single payment entry and Excel import
│       └── risk-analysis/             # Portfolio risk analysis calculations
├── components/                        # Shared UI components (tables, inputs, modals, sidebar)
├── database/
│   └── schema.sql                     # PostgreSQL table definitions and constraints
├── lib/                               # Core application logic
│   ├── api.ts                         # Frontend API client
│   ├── auth.ts                        # JWT session helpers (jose)
│   ├── db.ts                          # PostgreSQL connection pool (pg)
│   ├── types.ts                       # TypeScript interfaces
│   └── services/                      # Business logic modules (card, billing, payment, risk)
├── scripts/
│   └── create-admin.js                # Initial admin user bootstrap script
├── package.json                       # Dependencies and project scripts
├── vercel.json                        # Cron schedule definition
└── .env.local                         # Environment configuration (local)
```

---

## 10. Installation and Setup

### Prerequisites

- **Node.js:** Version `20.x` or later installed.
- **PostgreSQL Database:** A running PostgreSQL database (such as a free cloud database on [Neon](https://neon.tech)).
- **Package Manager:** `npm`.

---

### Step-by-Step Setup

#### 1. Clone the repository and install dependencies
```bash
git clone <repository-url>
cd credit-card-app
npm install
```

#### 2. Configure environment variables
Create a `.env.local` file in the root directory and add the configuration shown in the [Environment Variables](#environment-variables) section below.

#### 3. Initialize the database schema
Run the SQL schema file against your PostgreSQL database using `psql` or your database console:
```bash
psql "$DATABASE_URL" -f database/schema.sql
```

#### 4. Bootstrap the Administrator account
Run the setup script to seed the initial admin account into the database:
```bash
node scripts/create-admin.js
```
*Output: `Admin account created successfully.`*

#### 5. Seed initial merchant records
Because merchant registration has no UI form, insert a few standard merchants directly via SQL:
```sql
INSERT INTO MERCHANT (Merchant_Name, Category) VALUES
  ('Amazon', 'E-Commerce'),
  ('Apple Store', 'Electronics'),
  ('Uber', 'Transportation'),
  ('Starbucks', 'Dining'),
  ('Airlines', 'Travel');
```

---

### Environment Variables

Create `.env.local` in the project root:

```env
# PostgreSQL Database Connection String
DATABASE_URL=postgresql://username:password@your-host.neon.tech/neondb?sslmode=require

# Initial Admin Credentials (used by scripts/create-admin.js)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password_here

# Session Secret (minimum 32-character string for JWT signing)
SESSION_SECRET=your_secret_key_minimum_32_characters_long

# Cron Job Secret (protects the scheduled billing endpoint)
CRON_SECRET=your_cron_secret_token_here

# Gmail SMTP Settings for Billing Emails (optional)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_digit_app_password
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the application pool. |
| `ADMIN_USERNAME` | Yes | Username for initial administrator creation. |
| `ADMIN_PASSWORD` | Yes | Password for initial administrator creation. |
| `SESSION_SECRET` | Yes | High-entropy secret key for HS256 JWT tokens. |
| `CRON_SECRET` | Yes | Bearer token to authorize scheduled billing jobs. |
| `GMAIL_USER` | Optional | Gmail address for sending statement reminder emails. |
| `GMAIL_APP_PASSWORD` | Optional | Google App Password for Gmail SMTP authentication. |

---

### Running the Application

Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to `/login`. Sign in using your seeded administrator credentials (`admin`) to start provisioning staff and customer accounts.

---

## 11. Key API Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and sets the session cookie. |
| `POST` | `/api/auth/logout` | Authenticated | Clears the session cookie. |
| `GET` | `/api/auth/me` | Authenticated | Returns current user profile and role information. |
| `GET` | `/api/accounts` | `ADMIN` | Returns list of all user accounts or summary counts. |
| `POST` | `/api/customers` | `ADMIN` | Registers a new customer and creates login credentials. |
| `GET` | `/api/customers` | `EMPLOYEE`, `MANAGER`, `CUSTOMER` | Customer live search (`?search=`), profile lookup (`?id=`, `?me=true`). |
| `POST` | `/api/staff` | `ADMIN` | Creates new employee or manager staff credentials. |
| `POST` | `/api/cards` | `EMPLOYEE` | Submits a new card request in `PENDING_APPROVAL` status. |
| `GET` | `/api/cards` | `MANAGER`, `EMPLOYEE`, `CUSTOMER` | Lists pending approval cards, customer cards, or card details. |
| `PATCH`| `/api/cards?id=` | `MANAGER` | Approves (`ACTIVE`), blocks (`BLOCKED`), or closes (`CLOSED`) a card. |
| `POST` | `/api/transactions` | `EMPLOYEE` | Records an individual purchase, refund, or reversal. |
| `POST` | `/api/transactions/import` | `EMPLOYEE` | Batch-imports transactions from an uploaded Excel/CSV file. |
| `GET` | `/api/billing?cardId=` | `MANAGER`, `EMPLOYEE`, `CUSTOMER` | Returns billing statements and executes on-demand catch-up billing. |
| `GET` | `/api/billing/cron` | Authorized (`CRON_SECRET`) | Scheduled job generating weekly statements and sending emails. |
| `POST` | `/api/payments` | `EMPLOYEE` | Records a payment receipt against a statement. |
| `POST` | `/api/payments/import` | `EMPLOYEE`, `MANAGER` | Batch-imports payments from an uploaded Excel/CSV file. |
| `GET` | `/api/risk-analysis` | `MANAGER` | Returns portfolio risk assessment table. |

---

## 12. Limitations & Future Scope

### Current Limitations
- **Internal Ledger Simulation:** Transactions and payments are recorded manually or imported via spreadsheets rather than connected to live card networks (Visa/Mastercard) or payment gateways.
- **Rule-Based Risk Model:** Risk status is derived from fixed mathematical thresholds rather than predictive machine learning models.
- **Unidirectional Card Lifecycle:** Blocked cards cannot be returned to active status within the application; the only allowed subsequent action is account closure (`CLOSED`).
- **Customer Self-Repayment:** Customers can view statements and payment histories, but cannot submit repayments directly from their dashboard.
- **Merchant Management:** Merchants cannot be added through the UI; initial records must be seeded directly in the database.

### Future Scope
- **Payment Gateway Integration:** Connecting Stripe, Razorpay, or sandbox APIs to support live card authorizations and customer repayments.
- **Machine Learning Delinquency Prediction:** Training predictive models on historical payment patterns to forecast default probability.
- **Bidirectional Lifecycle Actions:** Implementing manager workflows to unblock cards after customer review or settlement.
- **Data Exporting:** Adding features to download statements, transactions, and audit logs as PDF or Excel files.
