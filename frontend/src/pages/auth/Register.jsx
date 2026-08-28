import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create your account</h1>
      <p>A savings account is created automatically.</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        <Field label="Full name">
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone (optional)">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" required minLength={6} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p style={{ color: "var(--risk-high)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 13 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
      {label}
      {children}
    </label>
  );
}
