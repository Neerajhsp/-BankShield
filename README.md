# BankShield


BankShield AI is a full-stack banking application built to simulate the day-to-day operations of a digital bank along with real-time fraud monitoring.

The application has two main user roles:

- **Customer** – manage accounts, make payments, transfer money, withdraw/deposit funds and view transaction history.
- **Banker / Cashier** – manage customers, perform branch operations, review suspicious transactions and handle fraud cases.

The main focus of the project is transaction security. Digital transactions are evaluated by a fraud detection layer before they are settled. Suspicious transactions can be placed on hold and sent to the banker for review.

---

## Features

### Customer Banking

- Customer registration and login
- JWT-based authentication
- Account balance and account information
- Deposit and withdrawal
- Money transfer
- Beneficiary management
- UPI-style payment flow
- Transaction history
- Account statement
- Security notifications
- Real-time transaction alerts

### Banker / Cashier Operations

- Separate banker login
- Role-based access control
- Customer search and lookup
- Add new customers
- Open customer accounts
- Cash deposit
- Cash withdrawal
- Transaction monitoring
- Fraud case review
- Approve or block suspicious transactions
- Audit history
- Risk and business insights

### Fraud Detection

Transactions are evaluated using a combination of transaction information and machine-learning based risk scoring.

The system considers factors such as:

- Transaction amount
- Transaction frequency
- Beneficiary history
- Account age
- Account balance
- Transaction context
- Previous transaction behaviour

Transactions with a high risk score can be placed on hold before settlement.

| Risk Score | Risk Level | Action |
|------------:|------------|--------|
| 0–39 | Low | Transaction proceeds |
| 40–69 | Medium | Transaction proceeds with monitoring |
| 70–100 | High | Transaction is held for review |

A banker can then approve or block the transaction from the fraud-management screen.

---

## Real-Time Alerts

BankShield AI uses WebSockets to keep the customer and banker interfaces updated without requiring a page refresh.

When a high-risk transaction is detected:

1. The transaction is placed on hold.
2. A fraud case is created.
3. The customer receives an in-app notification.
4. The banker dashboard receives the alert.
5. A browser notification/audio alert can be triggered.
6. Optional email and SMS notifications can be sent when SMTP/Twilio credentials are configured.

---

## Technology

### Frontend

- React
- Vite
- React Router
- Recharts
- CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- WebSockets

### Database

- MySQL 8
- InnoDB

### Machine Learning

- scikit-learn
- Isolation Forest
- pandas
- NumPy
- joblib

### Notifications

- WebSockets
- Browser Web Audio API
- SMTP
- Twilio SMS

---

## Application Flow

```text
Customer
   │
   ├── Login
   │
   ├── Transfer / Payment
   │
   ▼
Transaction API
   │
   ▼
Fraud Risk Engine
   │
   ├── Low / Medium ──────► Complete Transaction
   │
   └── High
        │
        ▼
     ON HOLD
        │
        ├── Customer Alert
        ├── Banker Alert
        └── Fraud Case
                │
          ┌─────┴─────┐
          ▼           ▼
       Approve       Block
          │           │
       Settle       Reject
