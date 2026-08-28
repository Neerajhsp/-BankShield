import { useEffect, useMemo, useState } from "react";
import { adminCustomers, createBankCustomer } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

const emptyForm = { full_name: "", email: "", phone: "", account_type: "SAVINGS", opening_balance: "0" };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const refresh = () => adminCustomers().then((r) => setCustomers(r.data)).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => customers.filter((c) =>
    `${c.full_name} ${c.email} ${c.phone || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setCreated(null); setBusy(true);
    try {
      const { data } = await createBankCustomer({ ...form, opening_balance: Number(form.opening_balance || 0) });
      setCreated(data); setForm(emptyForm); setShowForm(false); await refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create customer.");
    } finally { setBusy(false); }
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div><h3>Customer Management</h3><p>Open accounts, search customers and manage branch onboarding.</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm((v) => !v); setError(""); setCreated(null); }}>
          {showForm ? "Close form" : "+ Add New Customer"}
        </button>
      </div>

      {showForm && <div className="card">
        <div style={{ marginBottom: 14 }}><h3>Open a new customer account</h3><p>Banker-created accounts start with a temporary password. Ask the customer to use Forgot password after first sign-in.</p></div>
        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Field label="Full name"><input required value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} placeholder="Customer name" /></Field>
          <Field label="Email"><input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="customer@email.com" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91..." /></Field>
          <Field label="Account type"><select value={form.account_type} onChange={e => setForm({...form, account_type:e.target.value})}><option>SAVINGS</option><option>CURRENT</option><option>SALARY</option></select></Field>
          <Field label="Opening balance"><input type="number" min="0" step="0.01" value={form.opening_balance} onChange={e => setForm({...form, opening_balance:e.target.value})} placeholder="0" /></Field>
          <div style={{ display:"flex", alignItems:"end" }}><button className="btn btn-success" disabled={busy}>{busy ? "Creating..." : "Create Customer & Account"}</button></div>
        </form>
        {error && <p style={{ color:"var(--risk-high)", marginTop:12 }}>{error}</p>}
      </div>}

      {created && <div className="card" style={{ borderColor:"var(--risk-low)", background:"var(--risk-low-soft)" }}>
        <h3>✓ Customer created successfully</h3>
        <p style={{ marginTop: 6 }}>Share the temporary password securely; it is shown only here.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginTop:12 }}>
          <Stat label="Customer" value={created.customer.full_name} />
          <Stat label="Account" value={created.account.account_number} mono />
          <Stat label="Opening balance" value={`₹${Number(created.account.balance).toLocaleString("en-IN")}`} mono />
          <Stat label="Temporary password" value={created.temporary_password} mono />
        </div>
      </div>}

      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:12 }}>
          <div><h3>All customers</h3><p>{filtered.length} of {customers.length} customers</p></div>
          <input placeholder="Search name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:300 }} />
        </div>
        {filtered.length === 0 ? <EmptyState title="No customers found" /> : (
          <div style={{ overflowX:"auto" }}><table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>{filtered.map(c => <tr key={c.id}>
              <td><strong>{c.full_name}</strong></td><td className="mono">{c.email}</td><td className="mono">{c.phone || "—"}</td>
              <td>{new Date(c.created_at).toLocaleDateString()}</td><td><span className="badge badge-low">ACTIVE</span></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) { return <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12.5, color:"var(--text-muted)" }}>{label}{children}</label>; }
function Stat({ label, value, mono }) { return <div style={{ padding:12, border:"1px solid var(--border)", borderRadius:10, background:"var(--surface)" }}><div style={{ fontSize:11, color:"var(--text-faint)" }}>{label}</div><div className={mono ? "mono" : ""} style={{ marginTop:5, fontWeight:600 }}>{value}</div></div>; }
