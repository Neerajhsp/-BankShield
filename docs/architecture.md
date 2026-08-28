# Architecture

## High-level flow

```
Customer (React/Vite)                 Admin (React/Vite)
       │                                      │
       │  REST (JWT)          WebSocket       │  REST (JWT)   WebSocket
       ▼                       (/ws/alerts)   ▼                (/ws/alerts)
┌───────────────────────────────────────────────────────────────────┐
│                        FastAPI backend                            │
│  routes/  → services/  → models/ (SQLAlchemy)  → MySQL             │
│                │                                                    │
│                ├── risk_engine.py  ──uses──▶  ml/fraud_model.pkl   │
│                ├── fraud_service.py (fraud case orchestration)     │
│                ├── notification_service.py (DB + WebSocket push)   │
│                └── audit_service.py (audit_logs)                   │
└───────────────────────────────────────────────────────────────────┘
```

## Transaction pipeline (deposit / withdraw / transfer)

1. Route validates the request (amount > 0, sufficient balance, valid
   beneficiary/account).
2. `transaction_service` gathers the customer's behavioral stats
   (average amount, 24h frequency, prior HIGH-risk count, account age).
3. `risk_engine.analyze_transaction()` builds the feature vector,
   scores it with the trained Isolation Forest, and returns a
   risk_score (0-100), fraud_probability, risk_level, and reasons.
4. If `risk_score >= 70` → transaction status `ON_HOLD`, no funds move,
   `fraud_service.open_fraud_case()` creates a `FraudCase`, notifies the
   customer and every connected admin over `/ws/alerts`, and logs an
   audit entry.
5. Otherwise → transaction is `COMPLETED` immediately and balances are
   updated inside the same DB transaction.
6. An admin later calls `POST /api/admin/fraud-cases/{id}/approve` or
   `/block`, which resolves the case, optionally settles funds, and
   notifies the customer of the final outcome.

## Real-time alerts

`app/websocket/manager.py` keeps an in-memory map of `user_id` →
sockets and `role` → sockets. `notification_service.notify_user()` and
`notify_role()` push JSON events immediately; the frontend's
`useWebSocketAlerts` hook plays a Web Audio API beep and updates the UI
with no page refresh, auto-reconnecting on disconnect.
