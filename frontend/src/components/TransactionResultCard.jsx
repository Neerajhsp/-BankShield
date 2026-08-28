import RiskBadge from "./RiskBadge";
import StatusBadge from "./StatusBadge";

/**
 * Shown right after a deposit/withdraw/transfer completes. If the
 * transaction was put ON_HOLD, this is where the customer sees the
 * fraud-hold explanation described in spec section 9/11.
 */
export default function TransactionResultCard({ txn }) {
  if (!txn) return null;
  const held = txn.status === "ON_HOLD";

  return (
    <div className="card" style={{
      borderColor: held ? "var(--risk-high)" : "var(--border)",
      background: held ? "var(--risk-high-soft)" : "var(--surface)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{held ? "⚠ Transaction on hold" : "✓ Transaction submitted"}</h3>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{txn.reference}</span>
        </div>
        <StatusBadge status={txn.status} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        <Field label="Amount" value={`₹${Number(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
        <Field label="Risk score" value={`${txn.risk_score}/100`} />
        <Field label="Fraud probability" value={`${txn.fraud_probability}%`} />
        <Field label="Risk level" value={<RiskBadge level={txn.risk_level} pulse />} />
      </div>
      {txn.risk_reasons?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>Detection reasons</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {txn.risk_reasons.map((r, i) => <li key={i}>⚠ {r}</li>)}
          </ul>
        </div>
      )}
      {held && (
        <p style={{ marginTop: 14, fontSize: 13 }}>
          Your money has not moved. Our security team has been notified and will review this
          transaction shortly — you'll get a notification the moment it's resolved.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}
