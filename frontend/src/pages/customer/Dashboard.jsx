import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAccounts, listTransactions, getRiskProfile } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [txns, setTxns] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAccounts(), listTransactions({ limit: 6 }), getRiskProfile()])
      .then(([a, t, r]) => {
        setAccount(a.data[0]);
        setTxns(t.data);
        setRisk(r.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading your dashboard..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{
        background: "linear-gradient(135deg, var(--surface-raised), var(--surface))",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20,
      }}>
        <div>
          <p style={{ marginBottom: 2 }}>Welcome back,</p>
          <h1>{user?.full_name}</h1>
          <span className="mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            A/C {account?.account_number} · {account?.account_type} · <StatusBadge status={account?.status} />
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available balance</div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 600 }}>₹{Number(account?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <QuickAction to="/app/deposit" icon="⬇️" label="Deposit" />
        <QuickAction to="/app/withdraw" icon="⬆️" label="Withdraw" />
        <QuickAction to="/app/transfer" icon="💸" label="Send Money" />
        <QuickAction to="/app/beneficiaries" icon="👥" label="Beneficiaries" />
        <QuickAction to="/app/transactions" icon="📜" label="Transactions" />
        <QuickAction to="/app/statement" icon="🧾" label="Statement" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Recent transactions</h3>
            <Link to="/app/transactions" style={{ fontSize: 12.5 }}>View all →</Link>
          </div>
          {txns.length === 0 ? <EmptyState title="No transactions yet" subtitle="Make your first deposit to get started." /> : (
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Status</th><th>Risk</th></tr></thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.reference}</td>
                    <td>{t.type}</td>
                    <td className="mono">₹{Number(t.amount).toLocaleString("en-IN")}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><RiskBadge level={t.risk_level} score={t.risk_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Security status</h3>
          {risk && (
            <>
              <div style={{ margin: "14px 0" }}>
                <RiskBadge level={risk.risk_level} score={risk.risk_score} />
              </div>
              <Metric label="Suspicious transactions" value={risk.suspicious_transaction_count} />
              <Metric label="Avg. transaction amount" value={`₹${Number(risk.avg_transaction_amount).toLocaleString("en-IN")}`} />
              <Metric label="Transaction frequency" value={risk.transaction_frequency} />
              <Link to="/app/risk" style={{ fontSize: 12.5 }}>View full risk profile →</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label }) {
  return (
    <Link to={to} className="card" style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 18,
      textDecoration: "none", color: "var(--text)", transition: "background 0.15s",
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </Link>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 12.5 }}>{value}</span>
    </div>
  );
}
