import { useEffect, useMemo, useState } from "react";
import { listTransactions } from "../../services/api";
import RiskBadge from "../../components/RiskBadge";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    listTransactions({ limit: 200 }).then((r) => setTxns(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = txns;
    if (search) rows = rows.filter((t) => t.reference.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "ALL") rows = rows.filter((t) => t.type === typeFilter);
    if (statusFilter !== "ALL") rows = rows.filter((t) => t.status === statusFilter);
    rows = [...rows].sort((a, b) => sortDesc
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
    return rows;
  }, [txns, search, typeFilter, statusFilter, sortDesc]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (loading) return <LoadingState />;

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Search by reference..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 220 }} />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
          <option value="ALL">All types</option>
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          <option value="TRANSFER">Transfer</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
          <option value="ALL">All statuses</option>
          {["PENDING", "COMPLETED", "FAILED", "FLAGGED", "ON_HOLD", "BLOCKED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={() => setSortDesc((s) => !s)}>
          Sort: {sortDesc ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {filtered.length === 0 ? <EmptyState title="No matching transactions" /> : (
        <>
          <table>
            <thead>
              <tr><th>Reference</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {paged.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.reference}</td>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.type}</td>
                  <td className="mono">₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><RiskBadge level={t.risk_level} score={t.risk_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
              Page {page} of {totalPages} · {filtered.length} transactions
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
