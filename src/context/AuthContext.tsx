import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, login as apiLogin } from "../api/auth";
import { clearToken, getToken } from "../api/client";
import type { Agent } from "../types";

interface AuthContextValue {
  agent: Agent | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CACHED_AGENT_KEY = "expo_invoice_agent";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(() => {
    const cached = localStorage.getItem(CACHED_AGENT_KEY);
    return cached ? (JSON.parse(cached) as Agent) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // Verify the cached session against the server when online. If the
    // device is offline, keep using the cached agent so the app still works.
    fetchMe()
      .then((a) => {
        setAgent(a);
        localStorage.setItem(CACHED_AGENT_KEY, JSON.stringify(a));
      })
      .catch(() => {
        if (!navigator.onLine) {
          // Offline: trust the cached session rather than logging out.
          return;
        }
        setAgent(null);
        clearToken();
        localStorage.removeItem(CACHED_AGENT_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInAgent = await apiLogin(email, password);
    setAgent(loggedInAgent);
    localStorage.setItem(CACHED_AGENT_KEY, JSON.stringify(loggedInAgent));
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(CACHED_AGENT_KEY);
    setAgent(null);
  };

  return <AuthContext.Provider value={{ agent, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
