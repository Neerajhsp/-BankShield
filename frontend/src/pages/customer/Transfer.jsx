import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBeneficiaries, transfer } from "../../services/api";
import TransactionResultCard from "../../components/TransactionResultCard";

export default function Transfer() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ beneficiary_id: "", amount: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listBeneficiaries().then((r) => {
      setBeneficiaries(r.data);
      if (r.data.length) setForm((f) => ({ ...f, beneficiary_id: r.data[0].id }));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await transfer({ beneficiary_id: form.beneficiary_id, amount: Number(form.amount) });
      setResult(data);
      setForm((f) => ({ ...f, amount: "" }));
    } catch (err) {
      setError(err.response?.data?.detail || "Transfer failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
      <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3>Send money</h3>
        {beneficiaries.length === 0 ? (
          <p style={{ fontSize: 13 }}>
            You have no beneficiaries yet. <Link to="/app/beneficiaries">Add one first →</Link>
          </p>
        ) : (
          <>
            <label style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Beneficiary
              <select required value={form.beneficiary_id}
                onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })} style={{ marginTop: 6 }}>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>{b.beneficiary_name} — {b.account_number}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Amount (₹)
              <input type="number" min="1" step="0.01" required value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ marginTop: 6 }} placeholder="10000" />
            </label>
            {error && <p style={{ color: "var(--risk-high)", fontSize: 13 }}>{error}</p>}
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Processing..." : "Send money"}
            </button>
          </>
        )}
      </form>
      {result ? <TransactionResultCard txn={result} /> : (
        <div className="card" style={{ color: "var(--text-faint)" }}>
          Transfers to a brand-new beneficiary, or amounts well above your usual activity, raise the
          risk score and may be held for review before funds move.
        </div>
      )}
    </div>
  );
}
