import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const initial = params.get("role") === "bank" ? "BANK" : "CUSTOMER";
  const [role,setRole]=useState(initial); const [form,setForm]=useState({email:"",password:""}); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async(e)=>{e.preventDefault();setError("");setLoading(true);try{const user=await login(form.email,form.password);const expected=role==="BANK"?"ADMIN":"CUSTOMER";if(user.role!==expected){throw new Error(`This is a ${user.role === "ADMIN" ? "banker" : "customer"} account. Please use the correct login.`);}navigate(user.role==="ADMIN"?"/admin":"/app");}catch(err){setError(err.response?.data?.detail||err.message||"Login failed. Check your credentials.");}finally{setLoading(false);}};
  return <div>
    <h1>{role==="BANK"?"Banker Login":"Customer Login"}</h1><p>{role==="BANK"?"Secure branch, cashier and fraud operations console.":"Securely access your BankShield account and UPI payments."}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:18}}><button type="button" className={`btn ${role==="CUSTOMER"?"btn-primary":"btn-ghost"}`} onClick={()=>setRole("CUSTOMER")}>👤 Customer Login</button><button type="button" className={`btn ${role==="BANK"?"btn-primary":"btn-ghost"}`} onClick={()=>setRole("BANK")}>🏦 Bank Login</button></div>
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14,marginTop:20}}><Field label="Email"><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></Field><Field label="Password"><input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••"/></Field>{error&&<p style={{color:"var(--risk-high)",fontSize:13}}>{error}</p>}<button className="btn btn-primary" disabled={loading}>{loading?"Signing in...":role==="BANK"?"Sign in to Bank Console":"Sign in"}</button></form>
    <p style={{marginTop:12,fontSize:13}}><Link to="/forgot-password">Forgot password?</Link></p>
    <p style={{marginTop:12,fontSize:13}}>Customer account? <Link to="/register">Create one</Link></p>
    <div className="card" style={{marginTop:22,padding:14,fontSize:12.5}}><strong>Bank access</strong><p style={{margin:"6px 0 0",color:"var(--text-muted)"}}>Banker credentials are managed by the seed/configuration process and are intentionally not displayed here.</p></div>
  </div>;
}
function Field({label,children}){return <label style={{display:"flex",flexDirection:"column",gap:6,fontSize:12.5,color:"var(--text-muted)"}}>{label}{children}</label>}
