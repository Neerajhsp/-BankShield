import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    try { const { data } = await resetPassword({token: params.get("token") || "", new_password: password}); setMessage(data.detail); setTimeout(()=>navigate("/login"), 1200); }
    catch (err) { setError(err.response?.data?.detail || "Reset failed."); }
  };
  return <div>
    <h1>Set new password</h1><p>Choose a new password for your BankShield account.</p>
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14,marginTop:20}}>
      <input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" />
      {error && <p style={{color:"var(--risk-high)",fontSize:13}}>{error}</p>}
      {message && <p style={{color:"var(--risk-low)",fontSize:13}}>{message}</p>}
      <button className="btn btn-primary">Update password</button>
    </form>
    <p style={{marginTop:18,fontSize:13}}><Link to="/login">Back to login</Link></p>
  </div>;
}
