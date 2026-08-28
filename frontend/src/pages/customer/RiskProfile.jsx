import { useEffect, useState } from "react";
import { getRiskProfile } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import LoadingState from "../../components/LoadingState";

const LEVEL_ICON = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🔴" };

export default function RiskProfile() {
  const [risk, setRisk] = useState(null);

  useEffect(() => { getRiskProfile().then((r) => setRisk(r.data)); }, []);

  if (!risk) return <LoadingState />;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ textAlign: "center", padding: 36 }}>
        <div style={{ fontSize: 40 }}>{LEVEL_ICON[risk.risk_level]}</div>
        <h1 style={{ marginTop: 8 }}>{risk.risk_level} RISK</h1>
        <div className="mono" style={{ fontSize: 15, color: "var(--text-muted)" }}>
          Risk Score: {risk.risk_score}/100
        </div>
        <div style={{ marginTop: 14 }}><RiskBadge level={risk.risk_level} score={risk.risk_score} /></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Security overview</h3>
        <Row label="Suspicious transaction count" value={risk.suspicious_transaction_count} />
        <Row label="Average transaction amount" value={`₹${Number(risk.avg_transaction_amount).toLocaleString("en-IN")}`} />
        <Row label="Transaction frequency" value={risk.transaction_frequency} />
        <Row label="Last updated" value={new Date(risk.updated_at).toLocaleString()} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
      <span className="mono" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}
