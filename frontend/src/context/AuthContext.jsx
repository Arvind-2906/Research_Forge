"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await authService.getSession();
      if (res && res.user) {
        setUser(res.user);
        setSession(res.session);
      } else {
        // Fallback demo user for smooth local preview if no active cookie
        setUser({
          id: "usr_lead_01",
          name: "Dr. David Ross",
          email: "david.ross@researchforge.ai",
          role: "Principal Lead",
          initials: "DR",
        });
      }
    } catch {
      setUser({
        id: "usr_lead_01",
        name: "Dr. David Ross",
        email: "david.ross@researchforge.ai",
        role: "Principal Lead",
        initials: "DR",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    const res = await authService.signIn(email, password);
    if (res?.user) {
      setUser(res.user);
      setSession(res.session);
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authService.signUp(name, email, password);
    if (res?.user) {
      setUser(res.user);
      setSession(res.session);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.signOut();
    } finally {
      setUser(null);
      setSession(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        checkSession,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

