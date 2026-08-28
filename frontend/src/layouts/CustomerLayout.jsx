import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useWebSocketAlerts } from "../hooks/useWebSocketAlerts";

const NAV = [
  { to: "/app", label: "Dashboard", icon: "🏠", end: true },
  { to: "/app/deposit", label: "Deposit", icon: "⬇️" },
  { to: "/app/withdraw", label: "Withdraw", icon: "⬆️" },
  { to: "/app/transfer", label: "Send Money", icon: "💸" },
  { to: "/app/upi", label: "UPI Pay", icon: "📱" },
  { to: "/app/beneficiaries", label: "Beneficiaries", icon: "👥" },
  { to: "/app/transactions", label: "Transactions", icon: "📜" },
  { to: "/app/statement", label: "Statement", icon: "🧾" },
  { to: "/app/risk", label: "Risk Profile", icon: "🛡️" },
];

const TITLES = {
  "/app": "Dashboard", "/app/deposit": "Deposit", "/app/withdraw": "Withdraw",
  "/app/transfer": "Send Money", "/app/upi": "UPI / PhonePe / Paytm", "/app/beneficiaries": "Beneficiaries",
  "/app/transactions": "Transactions", "/app/statement": "Account Statement",
  "/app/risk": "Risk Profile",
};

export default function CustomerLayout() {
  const location = useLocation();
  const { connected } = useWebSocketAlerts();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar items={NAV} brandSub="Customer" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar title={TITLES[location.pathname] || "BankShield"} wsConnected={connected} />
        <main style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
