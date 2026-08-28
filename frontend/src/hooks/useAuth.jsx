import { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, register as apiRegister } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token, u) => {
    localStorage.setItem("bs_token", token);
    localStorage.setItem("bs_user", JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await apiLogin({ email, password });
    const u = { id: data.user_id, full_name: data.full_name, role: data.role };
    persist(data.access_token, u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await apiRegister(payload);
    const u = { id: data.user_id, full_name: data.full_name, role: data.role };
    persist(data.access_token, u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
