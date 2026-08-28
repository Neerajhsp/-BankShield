import { useEffect, useState } from "react";
import { adminAuditLogs } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { adminAuditLogs().then((r) => setLogs(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingState />;
  const filtered = logs.filter((l) => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <input placeholder="Search action or entity..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 260, marginBottom: 14 }} />
      {filtered.length === 0 ? <EmptyState title="No audit entries" /> : (
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>User</th></tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td><span className="badge badge-accent">{l.action}</span></td>
                <td>{l.entity}</td>
                <td className="mono" style={{ fontSize: 12 }}>{l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—"}</td>
                <td className="mono" style={{ fontSize: 12 }}>{l.user_id ? l.user_id.slice(0, 8) + "…" : "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
