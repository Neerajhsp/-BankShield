import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { adminInsights } from "../../services/api";
import LoadingState from "../../components/LoadingState";

export default function Insights(){
 const [d,setD]=useState(null); const [error,setError]=useState("");
 useEffect(()=>{adminInsights().then(r=>setD(r.data)).catch(e=>setError(e.response?.data?.detail||"Unable to load insights."));},[]);
 if(!d && !error)return <LoadingState label="Loading risk insights..."/>;
 if(error)return <div className="card"><h3>Insights unavailable</h3><p>{error}</p></div>;
 const s=d.summary; const mix=d.transaction_mix||[]; const reasons=d.top_risk_reasons||[];
 const riskData=[{name:"High risk",value:s.high_risk},{name:"Medium risk",value:s.medium_risk},{name:"Low / other",value:Math.max(0,s.total_transactions-s.high_risk-s.medium_risk)}];
 return <div style={{display:"flex",flexDirection:"column",gap:16}}>
  <div className="card" style={{background:"linear-gradient(135deg,var(--surface-raised),var(--surface))"}}><div className="badge badge-accent">ANALYTICS CENTER</div><h1 style={{marginTop:8}}>Risk & Business Insights</h1><p>Executive view of transaction volume, fraud exposure and the signals driving model decisions.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>{[["Transactions",s.total_transactions],["High risk",s.high_risk],["Medium risk",s.medium_risk],["On hold",s.on_hold],["Completed",s.completed],["Avg risk",s.avg_risk_score],["High-risk rate",`${s.high_risk_rate}%`]].map(([a,b])=><div className="card" key={a}><div style={{fontSize:11,color:"var(--text-faint)",textTransform:"uppercase"}}>{a}</div><div className="mono" style={{fontSize:24,marginTop:6}}>{b}</div></div>)}</div>
  <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16}}>
   <div className="card"><h3>Transaction volume by type</h3><p>Count and total monetary volume across the ledger.</p><div style={{height:300,marginTop:12}}><ResponsiveContainer width="100%" height="100%"><BarChart data={mix}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="type"/><YAxis/><Tooltip formatter={(v,n)=>n==="amount"?`₹${Number(v).toLocaleString("en-IN")}`:v}/><Bar dataKey="count" name="Transactions" fill="var(--accent)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
   <div className="card"><h3>Risk distribution</h3><p>Current exposure across the transaction population.</p><div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={92} innerRadius={54} label>{riskData.map((x,i)=><Cell key={x.name} fill={["var(--risk-high)","var(--risk-medium)","var(--risk-low)"][i]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div></div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
   <div className="card"><h3>Top risk signals</h3>{reasons.length?reasons.map(x=><div key={x.reason} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"12px 0",borderBottom:"1px solid var(--border)"}}><span>{x.reason}</span><span className="badge badge-high">{x.count}</span></div>):<p>No risk reasons recorded yet.</p>}</div>
   <div className="card"><h3>Transaction mix</h3>{mix.length?mix.map(x=><div key={x.type} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--border)"}}><span>{x.type}</span><span className="mono">{x.count} · ₹{Number(x.amount).toLocaleString("en-IN")}</span></div>):<p>No transactions yet.</p>}</div>
  </div>
 </div>
}
