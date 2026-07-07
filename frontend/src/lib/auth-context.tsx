"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Menyimpan token di localStorage supaya user tetap login walau refresh halaman.
// AuthProvider ini membungkus seluruh aplikasi lewat app/layout.tsx.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rumacart_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("rumacart_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("rumacart_token", result.token);
    setUser(result.user);
    return result.user;
  }

  async function register(name: string, email: string, password: string, phone?: string) {
    const result = await api.post<{ token: string; user: User }>("/auth/register", {
      name,
      email,
      password,
      phone,
    });
    localStorage.setItem("rumacart_token", result.token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem("rumacart_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
