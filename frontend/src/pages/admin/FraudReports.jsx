import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFraudReports } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function FraudReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { adminFraudReports().then((r) => setReports(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="card">
      {reports.length === 0 ? <EmptyState title="No fraud reports yet" /> : (
        <table>
          <thead><tr><th>Case</th><th>Date</th><th>Amount</th><th>Risk</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.case_number}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td className="mono">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                <td><RiskBadge level={r.risk_level} score={r.risk_score} /></td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => navigate(`/admin/fraud-reports/${r.id}`)}>View report →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
