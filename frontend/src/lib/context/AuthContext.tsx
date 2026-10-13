"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/client";
import { User } from "@/lib/api/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => { throw new Error("AuthContext not initialized"); },
  register: async () => { throw new Error("AuthContext not initialized"); },
  logout: async () => {},
  refreshUser: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.me();
      setUser(res.user);
      return res.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      setError(null);
      try {
        const res = await authApi.login(email, password);
        setUser(res.user);
        return res.user;
      } catch (err: any) {
        setError(err?.message || "Invalid email or password");
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (data: { email: string; password: string; full_name?: string }): Promise<User> => {
      setError(null);
      try {
        const res = await authApi.register(data);
        setUser(res.user);
        return res.user;
      } catch (err: any) {
        setError(err?.message || "Registration failed");
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("insightflow_selected_dataset_id");
      }
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
