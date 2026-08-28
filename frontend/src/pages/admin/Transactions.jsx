import { useEffect, useState } from "react";
import { adminTransactions } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => { adminTransactions().then((r) => setTxns(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingState />;
  const filtered = statusFilter === "ALL" ? txns : txns.filter((t) => t.status === statusFilter);

  return (
    <div className="card">
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180, marginBottom: 14 }}>
        <option value="ALL">All statuses</option>
        {["PENDING", "COMPLETED", "FAILED", "FLAGGED", "ON_HOLD", "BLOCKED"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {filtered.length === 0 ? <EmptyState title="No transactions" /> : (
        <table>
          <thead><tr><th>Reference</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.reference}</td>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.type}</td>
                <td className="mono">₹{Number(t.amount).toLocaleString("en-IN")}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><RiskBadge level={t.risk_level} score={t.risk_score} pulse /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
