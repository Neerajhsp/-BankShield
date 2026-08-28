import { useState } from "react";
import { Link } from "react-router-dom";
import { bankLookupAccount, bankCashDeposit, bankCashWithdrawal } from "../../services/api";
import TransactionResultCard from "../../components/TransactionResultCard";

export default function BankDesk(){
 const [number,setNumber]=useState(""); const [account,setAccount]=useState(null); const [amount,setAmount]=useState(""); const [result,setResult]=useState(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 const lookup=async()=>{setError("");setResult(null);try{const {data}=await bankLookupAccount(number.trim());setAccount(data);}catch(e){setAccount(null);setError(e.response?.data?.detail||"Account not found.");}};
 const cash=async(type)=>{setError("");setResult(null);setLoading(true);try{const fn=type==="deposit"?bankCashDeposit:bankCashWithdrawal;const {data}=await fn({account_number:number.trim(),amount:Number(amount)});setResult(data);setAmount("");const refreshed=await bankLookupAccount(number.trim());setAccount(refreshed.data);}catch(e){setError(e.response?.data?.detail||"Cash operation failed.");}finally{setLoading(false);}};
 return <div style={{display:"flex",flexDirection:"column",gap:16}}>
  <div className="card" style={{background:"linear-gradient(135deg,var(--surface-raised),var(--surface))"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
    <div><div className="badge badge-accent" style={{marginBottom:8}}>BRANCH OPERATIONS</div><h1>Bank Desk / Cashier</h1><p>Professional teller workflow for customer lookup, deposits, withdrawals and account servicing.</p></div>
    <Link className="btn btn-primary" to="/admin/customers">＋ Add New Customer</Link>
   </div>
  </div>
  <div className="card"><h3>Customer account lookup</h3><p>Search by BankShield account number before performing a cash operation.</p><div style={{display:"flex",gap:10,marginTop:12}}><input value={number} onChange={e=>setNumber(e.target.value)} onKeyDown={e=>e.key==='Enter'&&lookup()} placeholder="Account number e.g. BSA1234567890" style={{flex:1}}/><button className="btn btn-primary" onClick={lookup} disabled={!number.trim()}>Find customer</button></div>{error&&<p style={{color:"var(--risk-high)",fontSize:13,marginTop:10}}>{error}</p>}</div>
  {account&&<div className="card"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h3>{account.customer_name}</h3><p className="mono">{account.account_number} · {account.account_type}</p></div><span className="badge badge-low">ACCOUNT {account.status}</span></div><div style={{fontSize:30,fontWeight:700,margin:"16px 0"}}>₹{account.balance.toLocaleString("en-IN",{minimumFractionDigits:2})}</div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Cash amount" style={{maxWidth:220}}/><button className="btn btn-success" disabled={loading||!amount} onClick={()=>cash("deposit")}>{loading?"Processing...":"Cash Deposit"}</button><button className="btn btn-ghost" disabled={loading||!amount} onClick={()=>cash("withdraw")}>Cash Withdrawal</button></div><div style={{marginTop:12,fontSize:12,color:"var(--text-faint)"}}>✓ Teller operations settle immediately and are not sent through customer digital fraud scoring.</div></div>}
  {result&&<TransactionResultCard txn={result}/>} 
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>
   {[['👤','Customer onboarding','Create customer + savings/current account'],['💵','Cash services','Deposit and withdraw at the branch desk'],['🚨','Fraud desk','Review, approve or block high-risk digital activity'],['📈','Insights','Monitor transaction mix and risk trends']].map(([icon,title,text])=><div className="card" key={title}><div style={{fontSize:24}}>{icon}</div><h3 style={{marginTop:8}}>{title}</h3><p>{text}</p></div>)}
  </div>
 </div>
}
