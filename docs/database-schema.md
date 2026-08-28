# Database Schema

See `database/schema.sql` for the canonical, executable definition.
Summary of the 8 tables:

| Table | Purpose |
|---|---|
| `users` | Customers and admins. Bcrypt password hash, role enum. |
| `accounts` | One SAVINGS account per user (created at registration). DECIMAL(18,2) balance. |
| `beneficiaries` | Saved transfer recipients per customer. |
| `transactions` | Every deposit/withdrawal/transfer with risk_score, risk_level, fraud_probability, risk_reasons (JSON), status. |
| `risk_profiles` | One row per customer; rolling risk summary used on the dashboard and risk-profile page. |
| `fraud_cases` | One row per HIGH-risk transaction; case_number `FC-YYYY-XXXXX`, notification flags, admin decision. |
| `notifications` | In-app notifications (TRANSACTION/SECURITY/FRAUD/SYSTEM). |
| `audit_logs` | Append-only action log (login, transactions, fraud decisions, etc). |

All money columns use `DECIMAL(18,2)` — never `FLOAT` — to avoid
rounding errors. Foreign keys enforce referential integrity; JSON
columns (`risk_reasons`, `detection_reasons`, `metadata_json`) require
MySQL 5.7.8+ / 8.0.
