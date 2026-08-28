import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { adminDashboard } from "../../services/api";
import LoadingState from "../../components/LoadingState";

const RISK_COLORS = { LOW: "#34d399", MEDIUM: "#f5b944", HIGH: "#ff5c6c" };

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { adminDashboard().then((r) => setData(r.data)); }, []);

  if (!data) return <LoadingState />;
  const { cards, charts } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Total customers" value={cards.total_customers} />
        <StatCard label="Total accounts" value={cards.total_accounts} />
        <StatCard label="Total transactions" value={cards.total_transactions} />
        <StatCard label="Total deposits" value={`₹${cards.total_deposits.toLocaleString("en-IN")}`} />
        <StatCard label="Total withdrawals" value={`₹${cards.total_withdrawals.toLocaleString("en-IN")}`} />
        <StatCard label="Transfer volume" value={`₹${cards.transfer_volume.toLocaleString("en-IN")}`} />
        <StatCard label="Suspicious transactions" value={cards.suspicious_transactions} accent="var(--risk-medium)" />
        <StatCard label="Open fraud cases" value={cards.open_fraud_cases} accent="var(--risk-high)" pulse={cards.open_fraud_cases > 0} />
        <StatCard label="High-risk customers" value={cards.high_risk_customers} accent="var(--risk-high)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>Transaction volume (14 days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts.daily_volume}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8d97af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8d97af" }} />
              <Tooltip contentStyle={{ background: "#1b2333", border: "1px solid #2a3346", fontSize: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="#4c6fff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Risk distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={charts.risk_distribution} dataKey="count" nameKey="level" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.risk_distribution.map((d, i) => <Cell key={i} fill={RISK_COLORS[d.level] || "#8d97af"} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1b2333", border: "1px solid #2a3346", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>Fraud cases over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.fraud_cases_over_time}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8d97af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8d97af" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1b2333", border: "1px solid #2a3346", fontSize: 12 }} />
              <Bar dataKey="count" fill="#ff5c6c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Transaction type distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.type_distribution}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#8d97af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8d97af" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1b2333", border: "1px solid #2a3346", fontSize: 12 }} />
              <Bar dataKey="count" fill="#4c6fff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, pulse }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>
        {pulse && <span className="risk-pulse" />}
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: accent || "var(--text)" }}>{value}</div>
    </div>
  );
}
