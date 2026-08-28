# BankShield AI – upgraded local demo

## Added
- Separate **Customer Login** and **Bank Login** UI.
- Bank login uses the existing secure `ADMIN` role internally, but the UI calls it the **Bank Console**.
- Removed demo credentials from the login screen.
- Four banker/cashier seed accounts supported through `database/seed_bankers.py`.
- Banker **Cash Desk**: account lookup, cash deposit and cash withdrawal.
- Banker fraud operations remain available: fraud cases, approve/block, transactions, customers and audit logs.
- New **Risk & Business Insights** page with risk rate, averages, transaction mix and top risk signals.
- Customer **UPI / PhonePe / Paytm-style payment** flow; payments pass through the same AI risk engine.
- Customer deposit, withdrawal, transfer and UPI payment options.
- Forgot-password and reset-password flow for both customer and banker accounts.
- Real-time WebSocket fraud notifications now update the notification bell immediately; fraud events trigger the existing beep.
- High-risk transactions attempt real email and SMS delivery to the customer's registered contacts.
- Admin/bank fraud notifications are persisted in the database as well as pushed over WebSocket.

## Banker accounts
Run:

```bash
cd ~/BankShield-AI
source .venv/bin/activate
python database/seed_bankers.py
```

Default local-demo password for the four seeded banker accounts is `Neeraj@123`. Replace the emails with your own real banker emails by setting `BANKER_1_EMAIL` through `BANKER_4_EMAIL` in `.env` before running the seeder. The credentials are intentionally not shown in the website UI.

## Real email alerts
The app can send actual emails, but it cannot send mail without an SMTP account/app-password. Put these in the backend `.env`:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-alert-mail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=your-alert-mail@gmail.com
SMTP_TLS=1
```

For Gmail, use an **App Password**, not your normal Google password.

## Real SMS alerts
Set Twilio values in `.env`:

```text
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```

Without SMTP/Twilio, the app still provides database notifications, WebSocket real-time alerts and the fraud beep; the backend logs that the external channel is not configured.

## Frontend

```bash
cd ~/BankShield-AI/frontend
npm install
npm run dev
```

## Backend

```bash
cd ~/BankShield-AI
source .venv/bin/activate
PYTHONPATH=backend uvicorn app.main:app --reload
```

Open the frontend URL shown by Vite (normally `http://localhost:5173`).
