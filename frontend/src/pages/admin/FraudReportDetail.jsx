import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminFraudReportDetail, adminApproveCase, adminBlockCase } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";

export default function FraudReportDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => adminFraudReportDetail(caseId).then((r) => setReport(r.data));
  useEffect(() => { refresh(); }, [caseId]);

  const decide = async (action) => {
    setBusy(true);
    try {
      const fn = action === "APPROVE" ? adminApproveCase : adminBlockCase;
      await fn(caseId);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!report) return <LoadingState />;
  const openForDecision = report.case_status === "OPEN" || report.case_status === "UNDER_REVIEW";

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card" id="printable-report">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.06em" }}>FRAUD INCIDENT REPORT</div>
            <h1 style={{ marginTop: 4 }}>{report.report_title}</h1>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{report.case_number}</span>
          </div>
          <StatusBadge status={report.case_status} />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "18px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Transaction reference" value={report.transaction_reference} mono />
          <Field label="Customer" value={report.customer_name} />
          <Field label="Masked account" value={report.masked_account_number} mono />
          <Field label="Transaction type" value={report.transaction_type} />
          <Field label="Amount" value={`₹${Number(report.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} mono />
          <Field label="Date / time" value={new Date(report.date_time).toLocaleString()} />
          <Field label="Risk score" value={`${report.risk_score}/100`} mono />
          <Field label="Fraud probability" value={`${report.fraud_probability}%`} mono />
          <Field label="Risk level" value={<RiskBadge level={report.risk_level} />} />
          <Field label="New beneficiary" value={report.is_new_beneficiary ? "Yes" : "No"} />
          <Field label="Transaction status" value={<StatusBadge status={report.transaction_status} />} />
          <Field label="Customer notified" value={report.customer_notified ? "YES" : "NO"} />
          <Field label="Admin notified" value={report.admin_notified ? "YES" : "NO"} />
          <Field label="Alert sound triggered" value={report.alert_sound_triggered ? "YES" : "NO"} />
          <Field label="Admin decision" value={report.admin_decision || "Pending"} />
          <Field label="Resolution timestamp" value={report.resolution_timestamp ? new Date(report.resolution_timestamp).toLocaleString() : "—"} />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>Detection reasons</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(report.detection_reasons || []).map((r, i) => <li key={i} style={{ fontSize: 13.5 }}>⚠ {r}</li>)}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={() => window.print()}>🖨️ Print report</button>
        <button className="btn btn-ghost" onClick={() => {
          const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `${report.case_number}.json`; a.click();
          URL.revokeObjectURL(url);
        }}>⬇️ Download report</button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        {openForDecision && (
          <>
            <button className="btn btn-success" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => decide("APPROVE")}>Approve</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => decide("BLOCK")}>Block</button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}
