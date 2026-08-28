import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div style={{
      minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr",
    }}>
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "10vh 64px", background: "radial-gradient(circle at 20% 20%, #14203a, #0a0e17 70%)",
        borderRight: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff", fontSize: 18,
          }}>B</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>BankShield</span>
        </div>
        <h1 style={{ fontSize: 34, maxWidth: 420 }}>Every transaction, watched in real time.</h1>
        <p style={{ maxWidth: 420, fontSize: 15 }}>
          BankShield scores every deposit, withdrawal, and transfer against a live
          anomaly-detection model — holding suspicious activity before money moves,
          and alerting both customer and security desk instantly.
        </p>
        <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
          <Stat label="Risk scored" value="< 200ms" />
          <Stat label="Alert channel" value="WebSocket" />
          <Stat label="Model" value="Isolation Forest" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: 380, maxWidth: "100%" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
