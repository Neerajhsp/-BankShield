import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("bs_token");
      localStorage.removeItem("bs_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const register = (data) => api.post("/api/auth/register", data);
export const login = (data) => api.post("/api/auth/login", data);
export const getMe = () => api.get("/api/customers/me");

// ---- Accounts ----
export const listAccounts = () => api.get("/api/accounts");

// ---- Beneficiaries ----
export const listBeneficiaries = () => api.get("/api/beneficiaries");
export const addBeneficiary = (data) => api.post("/api/beneficiaries", data);
export const deleteBeneficiary = (id) => api.delete(`/api/beneficiaries/${id}`);

// ---- Transactions ----
export const deposit = (data) => api.post("/api/transactions/deposit", data);
export const withdraw = (data) => api.post("/api/transactions/withdraw", data);
export const transfer = (data) => api.post("/api/transactions/transfer", data);
export const listTransactions = (params) => api.get("/api/transactions", { params });
export const getTransaction = (id) => api.get(`/api/transactions/${id}`);

// ---- Risk ----
export const getRiskProfile = () => api.get("/api/risk/profile");

// ---- Notifications ----
export const listNotifications = () => api.get("/api/notifications");
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`);

// ---- Admin ----
export const adminDashboard = () => api.get("/api/admin/dashboard");
export const adminCustomers = () => api.get("/api/admin/customers");
export const createBankCustomer = (data) => api.post("/api/admin/customers", data);
export const adminTransactions = () => api.get("/api/admin/transactions");
export const adminFraudCases = () => api.get("/api/admin/fraud-cases");
export const adminFraudReports = () => api.get("/api/admin/fraud-reports");
export const adminFraudReportDetail = (id) => api.get(`/api/admin/fraud-reports/${id}`);
export const adminApproveCase = (id) => api.post(`/api/admin/fraud-cases/${id}/approve`, { decision: "APPROVE" });
export const adminBlockCase = (id) => api.post(`/api/admin/fraud-cases/${id}/block`, { decision: "BLOCK" });
export const adminAuditLogs = () => api.get("/api/admin/audit-logs");
export const upiPayment = (data) => api.post("/api/transactions/upi", data);
export const forgotPassword = (email) => api.post("/api/auth/forgot-password", { email });
export const resetPassword = (data) => api.post("/api/auth/reset-password", data);
export const bankLookupAccount = (accountNumber) => api.get(`/api/admin/accounts/lookup/${encodeURIComponent(accountNumber)}`);
export const bankCashDeposit = (data) => api.post("/api/admin/cash-deposit", data);
export const bankCashWithdrawal = (data) => api.post("/api/admin/cash-withdrawal", data);
export const adminInsights = () => api.get("/api/admin/insights");
