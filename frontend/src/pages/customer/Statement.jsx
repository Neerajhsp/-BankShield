import { useEffect, useMemo, useState } from "react";
import { listAccounts, listTransactions } from "../../services/api";
import StatusBadge from "../../components/StatusBadge";
import LoadingState from "../../components/LoadingState";

export default function Statement() {
  const [account, setAccount] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAccounts(), listTransactions({ limit: 200 })])
      .then(([a, t]) => { setAccount(a.data[0]); setTxns(t.data.filter((x) => x.status === "COMPLETED")); })
      .finally(() => setLoading(false));
  }, []);

  const { credits, debits, opening, closing } = useMemo(() => {
    const sorted = [...txns].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const creditTotal = sorted.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + Number(t.amount), 0);
    const debitTotal = sorted.filter((t) => t.type !== "DEPOSIT").reduce((s, t) => s + Number(t.amount), 0);
    const closingBal = Number(account?.balance || 0);
    const openingBal = closingBal - creditTotal + debitTotal;
    return { credits: creditTotal, debits: debitTotal, opening: openingBal, closing: closingBal };
  }, [txns, account]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <SummaryItem label="Opening balance" value={opening} />
          <SummaryItem label="Credits" value={credits} positive />
          <SummaryItem label="Debits" value={debits} negative />
          <SummaryItem label="Closing balance" value={closing} />
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => window.print()}>🖨️ Print statement</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="mono">{t.reference}</td>
                <td>{t.type}</td>
                <td className="mono" style={{ color: t.type === "DEPOSIT" ? "var(--risk-low)" : "var(--risk-high)" }}>
                  {t.type === "DEPOSIT" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, positive, negative }) {
  const color = positive ? "var(--risk-low)" : negative ? "var(--risk-high)" : "var(--text)";
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, color, fontWeight: 600 }}>
        ₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}
