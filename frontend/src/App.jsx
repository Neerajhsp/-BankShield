import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import CustomerDashboard from "./pages/customer/Dashboard";
import Deposit from "./pages/customer/Deposit";
import Withdraw from "./pages/customer/Withdraw";
import Transfer from "./pages/customer/Transfer";
import Beneficiaries from "./pages/customer/Beneficiaries";
import Transactions from "./pages/customer/Transactions";
import Statement from "./pages/customer/Statement";
import RiskProfile from "./pages/customer/RiskProfile";
import UPIPayment from "./pages/customer/UPIPayment";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminCustomers from "./pages/admin/Customers";
import AdminTransactions from "./pages/admin/Transactions";
import FraudCases from "./pages/admin/FraudCases";
import FraudReports from "./pages/admin/FraudReports";
import FraudReportDetail from "./pages/admin/FraudReportDetail";
import AuditLogs from "./pages/admin/AuditLogs";
import BankDesk from "./pages/admin/BankDesk";
import Insights from "./pages/admin/Insights";

import { useAuth } from "./hooks/useAuth.jsx";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route path="/app" element={<ProtectedRoute role="CUSTOMER"><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="withdraw" element={<Withdraw />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="beneficiaries" element={<Beneficiaries />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="statement" element={<Statement />} />
        <Route path="risk" element={<RiskProfile />} />
        <Route path="upi" element={<UPIPayment />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="fraud-cases" element={<FraudCases />} />
        <Route path="fraud-reports" element={<FraudReports />} />
        <Route path="fraud-reports/:caseId" element={<FraudReportDetail />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="bank-desk" element={<BankDesk />} />
        <Route path="insights" element={<Insights />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? (user.role === "ADMIN" ? "/admin" : "/app") : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
