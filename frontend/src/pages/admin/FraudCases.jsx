import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFraudCases, adminApproveCase, adminBlockCase } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";

export default function FraudCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionTarget, setDecisionTarget] = useState(null); // { case, action }
  const [busy, setBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const navigate = useNavigate();

  const refresh = () => adminFraudCases().then((r) => setCases(r.data)).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const openCases = cases.filter((c) => c.status === "OPEN" || c.status === "UNDER_REVIEW");
  const resolvedCases = cases.filter((c) => !(c.status === "OPEN" || c.status === "UNDER_REVIEW"));

  const confirmDecision = async () => {
    if (!decisionTarget) return;
    setBusy(true);
    setDecisionError("");
    try {
      const fn = decisionTarget.action === "APPROVE" ? adminApproveCase : adminBlockCase;
      await fn(decisionTarget.case.id);
      setDecisionTarget(null);
      await refresh();
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Unable to process the fraud case.";
      setDecisionError(message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {openCases.length > 0 && <span className="risk-pulse" />}
          <h3 style={{ margin: 0 }}>🚨 Live fraud alerts ({openCases.length} open)</h3>
        </div>
        {openCases.length === 0 ? <EmptyState title="No open fraud cases" subtitle="All clear." /> : (
          <table>
            <thead><tr><th>Case</th><th>Customer</th><th>Amount</th><th>Risk</th><th>Fraud prob.</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {openCases.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ cursor: "pointer", color: "var(--accent)" }}
                    onClick={() => navigate(`/admin/fraud-reports/${c.id}`)}>{c.case_number}</td>
                  <td className="mono">{c.customer_id.slice(0, 8)}…</td>
                  <td className="mono">₹{Number(c.amount).toLocaleString("en-IN")}</td>
                  <td><RiskBadge level={c.risk_level} score={c.risk_score} pulse /></td>
                  <td className="mono">{c.fraud_probability}%</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-success" style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => setDecisionTarget({ case: c, action: "APPROVE" })}>Approve</button>
                    <button className="btn btn-danger" style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => setDecisionTarget({ case: c, action: "BLOCK" })}>Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Resolved cases</h3>
        {resolvedCases.length === 0 ? <EmptyState title="No resolved cases yet" /> : (
          <table>
            <thead><tr><th>Case</th><th>Amount</th><th>Risk</th><th>Status</th><th>Decision</th></tr></thead>
            <tbody>
              {resolvedCases.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ cursor: "pointer", color: "var(--accent)" }}
                    onClick={() => navigate(`/admin/fraud-reports/${c.id}`)}>{c.case_number}</td>
                  <td className="mono">₹{Number(c.amount).toLocaleString("en-IN")}</td>
                  <td><RiskBadge level={c.risk_level} score={c.risk_score} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.admin_decision || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!decisionTarget} title={`${decisionTarget?.action === "APPROVE" ? "Approve" : "Block"} transaction`}
        onClose={() => { setDecisionTarget(null); setDecisionError(""); }}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setDecisionTarget(null)}>Cancel</button>
          <button className={decisionTarget?.action === "APPROVE" ? "btn btn-success" : "btn btn-danger"}
            onClick={confirmDecision} disabled={busy}>
            {busy ? "Processing..." : `Confirm ${decisionTarget?.action?.toLowerCase()}`}
          </button>
        </>}>
        {decisionError && (
          <div className="card" style={{ marginBottom: 12, padding: 10, borderLeft: "3px solid var(--risk-high)" }}>
            <strong>Action failed</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{decisionError}</p>
          </div>
        )}
        <p>
          {decisionTarget?.action === "APPROVE"
            ? "This will release the hold and complete the transaction — funds will move."
            : "This will permanently block the transaction — funds will not move."}
        </p>
        <p className="mono" style={{ fontSize: 12.5 }}>
          Case {decisionTarget?.case?.case_number} · ₹{Number(decisionTarget?.case?.amount || 0).toLocaleString("en-IN")}
        </p>
      </Modal>
    </div>
  );
}
