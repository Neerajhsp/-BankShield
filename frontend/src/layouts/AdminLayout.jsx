import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useWebSocketAlerts } from "../hooks/useWebSocketAlerts";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/bank-desk", label: "Bank Desk / Cashier", icon: "🏦" },
  { to: "/admin/customers", label: "Customers", icon: "👥" },
  { to: "/admin/transactions", label: "Transactions", icon: "📜" },
  { to: "/admin/fraud-cases", label: "Fraud Cases", icon: "🚨" },
  { to: "/admin/fraud-reports", label: "Fraud Reports", icon: "📄" },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: "🔍" },
  { to: "/admin/insights", label: "Insights", icon: "📈" },
];

const TITLES = {
  "/admin": "Bank Dashboard", "/admin/customers": "Customers", "/admin/transactions": "All Transactions",
  "/admin/fraud-cases": "Fraud Cases", "/admin/fraud-reports": "Fraud Reports", "/admin/audit-logs": "Audit Logs", "/admin/bank-desk": "Bank Desk / Cashier", "/admin/insights": "Risk & Business Insights",
};

export default function AdminLayout() {
  const location = useLocation();
  const { connected } = useWebSocketAlerts();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar items={NAV} brandSub="Bank Console" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar title={TITLES[location.pathname] || "Admin"} wsConnected={connected} />
        <main style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
