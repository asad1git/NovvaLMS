import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("novva_token");
    const role = localStorage.getItem("novva_role");
    const name = localStorage.getItem("novva_name");
    return token ? { token, role, name } : null;
  });

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, role, name } = res.data.data;

    localStorage.setItem("novva_token", token);
    localStorage.setItem("novva_role", role);
    localStorage.setItem("novva_name", name);
    setAuth({ token, role, name });

    return { role };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("novva_token");
    localStorage.removeItem("novva_role");
    localStorage.removeItem("novva_name");
    setAuth(null);
  }, []);

  const updateName = useCallback((name) => {
    localStorage.setItem("novva_name", name);
    setAuth((prev) => (prev ? { ...prev, name } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout, updateName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
