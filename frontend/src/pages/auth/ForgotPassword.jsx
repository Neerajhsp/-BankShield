import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage("");
    try { const { data } = await forgotPassword(email); setMessage(data.detail); }
    catch (err) { setMessage(err.response?.data?.detail || "Unable to process request."); }
    finally { setLoading(false); }
  };
  return <div>
    <h1>Forgot password</h1>
    <p>Enter your registered email and we will send a reset link.</p>
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14,marginTop:20}}>
      <label style={{fontSize:12.5,color:"var(--text-muted)"}}>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{marginTop:6}} /></label>
      {message && <p style={{fontSize:13,color:"var(--risk-low)"}}>{message}</p>}
      <button className="btn btn-primary" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
    </form>
    <p style={{marginTop:18,fontSize:13}}><Link to="/login">← Back to login</Link></p>
  </div>;
}
