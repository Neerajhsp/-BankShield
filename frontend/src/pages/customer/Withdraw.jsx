import { useState } from "react";
import { withdraw } from "../../services/api";
import TransactionResultCard from "../../components/TransactionResultCard";

export default function Withdraw() {
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await withdraw({ amount: Number(amount) });
      setResult(data);
      setAmount("");
    } catch (err) {
      setError(err.response?.data?.detail || "Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
      <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3>Withdraw funds</h3>
        <label style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Amount (₹)
          <input type="number" min="1" step="0.01" required value={amount}
            onChange={(e) => setAmount(e.target.value)} style={{ marginTop: 6 }} placeholder="5000" />
        </label>
        {error && <p style={{ color: "var(--risk-high)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </form>
      {result ? <TransactionResultCard txn={result} /> : (
        <div className="card" style={{ color: "var(--text-faint)" }}>
          Withdrawals over your usual pattern may be held for security review.
        </div>
      )}
    </div>
  );
}
