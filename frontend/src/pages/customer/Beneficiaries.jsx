import { useEffect, useState } from "react";
import { listBeneficiaries, addBeneficiary, deleteBeneficiary } from "../../services/api";
import Modal from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";

const EMPTY_FORM = { beneficiary_name: "", account_number: "", bank_name: "", ifsc: "" };

export default function Beneficiaries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => listBeneficiaries().then((r) => setList(r.data)).finally(() => setLoading(false));

  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      await addBeneficiary(form);
      setForm(EMPTY_FORM);
      setModalOpen(false);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this beneficiary?")) return;
    await deleteBeneficiary(id);
    refresh();
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ margin: 0 }}>Manage the people and accounts you send money to.</p>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Add beneficiary</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No beneficiaries yet" subtitle="Add one to start sending money." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {list.map((b) => (
            <div key={b.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>{b.beneficiary_name}</h3>
                <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => remove(b.id)}>Remove</button>
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{b.account_number}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{b.bank_name} · {b.ifsc}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Add beneficiary" onClose={() => setModalOpen(false)}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Add"}</button>
        </>}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input required placeholder="Beneficiary name" value={form.beneficiary_name}
            onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })} />
          <input required placeholder="Account number" value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          <input required placeholder="Bank name" value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          <input required placeholder="IFSC code" value={form.ifsc}
            onChange={(e) => setForm({ ...form, ifsc: e.target.value })} />
          {error && <p style={{ color: "var(--risk-high)", fontSize: 13 }}>{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
