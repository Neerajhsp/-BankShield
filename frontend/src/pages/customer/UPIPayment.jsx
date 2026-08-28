import { useState } from "react";
import { upiPayment } from "../../services/api";
import TransactionResultCard from "../../components/TransactionResultCard";

export default function UPIPayment() {
  const [form,setForm]=useState({upi_id:"",merchant:"",amount:""}); const [result,setResult]=useState(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async(e)=>{e.preventDefault();setError("");setResult(null);setLoading(true);try{const {data}=await upiPayment({...form,amount:Number(form.amount)});setResult(data);setForm({upi_id:"",merchant:"",amount:""});}catch(err){setError(err.response?.data?.detail||"UPI payment failed.");}finally{setLoading(false);}};
  return <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20,alignItems:"start"}}>
    <form onSubmit={submit} className="card" style={{display:"flex",flexDirection:"column",gap:14}}><h3>UPI / PhonePe / Paytm</h3>
      <label>UPI ID<input required value={form.upi_id} onChange={e=>setForm({...form,upi_id:e.target.value})} style={{marginTop:6}} placeholder="merchant@upi"/></label>
      <label>Merchant / person<input required value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})} style={{marginTop:6}} placeholder="Cafe / Friend"/></label>
      <label>Amount (₹)<input type="number" min="1" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{marginTop:6}} placeholder="500"/></label>
      {error&&<p style={{color:"var(--risk-high)",fontSize:13}}>{error}</p>}<button className="btn btn-primary" disabled={loading}>{loading?"Checking risk...":"Pay securely"}</button>
    </form>{result?<TransactionResultCard txn={result}/>:<div className="card"><h3>Secure UPI payment</h3><p style={{color:"var(--text-muted)"}}>UPI payments pass through the same AI risk engine. High-risk payments are held before money moves.</p></div>}
  </div>;
}
