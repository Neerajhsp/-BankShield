import { useState } from "react";
import { deposit } from "../../services/api";
import TransactionResultCard from "../../components/TransactionResultCard";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await deposit({ amount: Number(amount) });
      setResult(data);
      setAmount("");
    } catch (err) {
      setError(err.response?.data?.detail || "Deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
      <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3>Deposit funds</h3>
        <label style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Amount (₹)
          <input type="number" min="1" step="0.01" required value={amount}
            onChange={(e) => setAmount(e.target.value)} style={{ marginTop: 6 }} placeholder="10000" />
        </label>
        {error && <p style={{ color: "var(--risk-high)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Processing..." : "Deposit"}
        </button>
      </form>
      {result ? <TransactionResultCard txn={result} /> : (
        <div className="card" style={{ color: "var(--text-faint)" }}>
          Every deposit is scored by the AI risk engine in real time. Results will appear here.
        </div>
      )}
    </div>
  );
}
