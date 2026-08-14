import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  fetchMe,
  login as apiLogin,
} from "../api/auth";

import {
  clearToken,
  getToken,
} from "../api/client";

import type {
  Agent,
} from "../types/index";

// ============================================================
// AUTH + GST CONTEXT TYPE
// ============================================================

interface AuthContextValue {
  agent: Agent | null;

  loading: boolean;

  login: (
    email: string,
    password: string,
  ) => Promise<void>;

  logout: () => void;

  // ----------------------------------------------------------
  // GST SETTINGS
  // ----------------------------------------------------------

  /**
   * true  -> GST is enabled for new invoices
   * false -> GST is disabled for new invoices
   */
  gstEnabled: boolean;

  /**
   * Default GST percentage.
   *
   * Rooch default:
   *
   * 3 -> 3%
   */
  gstRate: number;

  /**
   * Enable / disable GST.
   */
  setGstEnabled: (
    enabled: boolean,
  ) => void;

  /**
   * Change default GST rate.
   */
  setGstRate: (
    rate: number,
  ) => void;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

const CACHED_AGENT_KEY =
  "expo_invoice_agent";

const GST_ENABLED_KEY =
  "expo_invoice_gst_enabled";

const GST_RATE_KEY =
  "expo_invoice_gst_rate";

// ============================================================
// DEFAULT GST SETTINGS
// ============================================================

/**
 * Rooch default GST configuration.
 *
 * GST is OFF by default.
 *
 * When enabled, default GST rate is 3%.
 */
const DEFAULT_GST_ENABLED =
  false;

const DEFAULT_GST_RATE =
  3;

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ==========================================================
  // AGENT
  // ==========================================================

  const [
    agent,
    setAgent,
  ] = useState<Agent | null>(() => {
    const cached =
      localStorage.getItem(
        CACHED_AGENT_KEY,
      );

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(
        cached,
      ) as Agent;
    } catch {
      localStorage.removeItem(
        CACHED_AGENT_KEY,
      );

      return null;
    }
  });

  // ==========================================================
  // LOADING
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ==========================================================
  // GST ENABLED
  // ==========================================================

  const [
    gstEnabled,
    setGstEnabledState,
  ] = useState<boolean>(() => {
    const saved =
      localStorage.getItem(
        GST_ENABLED_KEY,
      );

    if (saved === null) {
      return DEFAULT_GST_ENABLED;
    }

    return saved === "true";
  });

  // ==========================================================
  // GST RATE
  // ==========================================================

  const [
    gstRate,
    setGstRateState,
  ] = useState<number>(() => {
    const saved =
      localStorage.getItem(
        GST_RATE_KEY,
      );

    if (saved === null) {
      return DEFAULT_GST_RATE;
    }

    const parsed =
      Number(saved);

    if (!Number.isFinite(parsed)) {
      return DEFAULT_GST_RATE;
    }

    return Math.min(
      100,
      Math.max(
        0,
        parsed,
      ),
    );
  });

  // ==========================================================
  // VERIFY LOGIN SESSION
  // ==========================================================

  useEffect(() => {
    const token =
      getToken();

    if (!token) {
      setLoading(false);

      return;
    }

    fetchMe()
      .then((currentAgent) => {
        setAgent(
          currentAgent,
        );

        localStorage.setItem(
          CACHED_AGENT_KEY,
          JSON.stringify(
            currentAgent,
          ),
        );
      })
      .catch(() => {
        // ----------------------------------------------------
        // OFFLINE
        // ----------------------------------------------------

        if (!navigator.onLine) {
          /*
           * Keep cached agent when offline.
           *
           * This allows the exhibition application
           * to continue working without internet.
           */

          return;
        }

        // ----------------------------------------------------
        // ONLINE BUT SESSION INVALID
        // ----------------------------------------------------

        setAgent(null);

        clearToken();

        localStorage.removeItem(
          CACHED_AGENT_KEY,
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (
    email: string,
    password: string,
  ) => {
    const loggedInAgent =
      await apiLogin(
        email,
        password,
      );

    setAgent(
      loggedInAgent,
    );

    localStorage.setItem(
      CACHED_AGENT_KEY,
      JSON.stringify(
        loggedInAgent,
      ),
    );
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {
    clearToken();

    localStorage.removeItem(
      CACHED_AGENT_KEY,
    );

    setAgent(null);
  };

  // ==========================================================
  // SET GST ENABLED
  // ==========================================================

  const setGstEnabled = (
    enabled: boolean,
  ) => {
    const normalized =
      Boolean(enabled);

    setGstEnabledState(
      normalized,
    );

    localStorage.setItem(
      GST_ENABLED_KEY,
      String(normalized),
    );
  };

  // ==========================================================
  // SET GST RATE
  // ==========================================================

  const setGstRate = (
    rate: number,
  ) => {
    const numericRate =
      Number(rate);

    const normalizedRate =
      Number.isFinite(
        numericRate,
      )
        ? Math.min(
            100,
            Math.max(
              0,
              numericRate,
            ),
          )
        : DEFAULT_GST_RATE;

    setGstRateState(
      normalizedRate,
    );

    localStorage.setItem(
      GST_RATE_KEY,
      String(
        normalizedRate,
      ),
    );
  };

  // ==========================================================
  // CONTEXT PROVIDER
  // ==========================================================

  return (
    <AuthContext.Provider
      value={{
        agent,

        loading,

        login,

        logout,

        gstEnabled,

        gstRate,

        setGstEnabled,

        setGstRate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// USE AUTH
// ============================================================

export function useAuth(): AuthContextValue {
  const ctx =
    useContext(
      AuthContext,
    );

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider",
    );
  }

  return ctx;
}
