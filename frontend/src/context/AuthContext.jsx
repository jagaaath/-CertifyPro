// ============================================
// AuthContext
// Global authentication state management
// Provides user info and auth functions to
// every component in the app via React Context
//
// What it provides:
//   user      — current user object from DB
//   role      — 'student' | 'faculty' | 'admin'
//   token     — JWT token string
//   loading   — true while checking auth on startup
//   login()   — save auth data after successful login
//   logout()  — clear all auth data + redirect
//   isAuth    — boolean, true if logged in
// ============================================

import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axios";

// ── Create the Context ─────────────────────────
// This is what components import and subscribe to
const AuthContext = createContext(null);

// ── AuthProvider Component ─────────────────────
// Wraps the entire app — all children can access
// the auth state via useAuth() hook
export const AuthProvider = ({ children }) => {
  // ── State ──────────────────────────────────────
  const [user, setUser]       = useState(null);   // User object
  const [role, setRole]       = useState(null);   // User's role
  const [token, setToken]     = useState(null);   // JWT token
  const [loading, setLoading] = useState(true);   // Initial load check

  // ════════════════════════════════════════════════
  // ON MOUNT — Restore session from localStorage
  // When the page refreshes, we check if a token
  // exists and re-validate it with the backend
  // ════════════════════════════════════════════════
  useEffect(() => {
    const restoreSession = async () => {
      // Check if token exists in localStorage
      const savedToken = localStorage.getItem("token");
      const savedRole  = localStorage.getItem("role");
      const savedUser  = localStorage.getItem("user");

      if (savedToken && savedRole && savedUser) {
        try {
          // ── Verify token with backend ────────────
          // GET /api/auth/me — returns current user
          // Axios interceptor auto-attaches the token
          const res = await axiosInstance.get("/auth/me");

          if (res.data.success) {
            // Token is still valid — restore session
            setToken(savedToken);
            setRole(savedRole);
            setUser(res.data.user);
          }
        } catch (error) {
          // Token is expired or invalid
          // Clear everything and start fresh
          console.log("Session expired. Please log in again.");
          clearAuthData();
        }
      }

      // Done checking — allow app to render
      setLoading(false);
    };

    restoreSession();
  }, []); // Empty array = run once on mount

  // ════════════════════════════════════════════════
  // login() — Called after successful API login
  // Stores token + user in state AND localStorage
  //
  // @param token  {String} — JWT token from server
  // @param user   {Object} — user data from server
  // @param role   {String} — 'student'|'faculty'|'admin'
  // ════════════════════════════════════════════════
  const login = (token, user, role) => {
    // ── Save to localStorage ─────────────────────
    // Persists across page refreshes
    localStorage.setItem("token", token);
    localStorage.setItem("role",  role);
    localStorage.setItem("user",  JSON.stringify(user));

    // ── Save to React state ──────────────────────
    // Triggers re-render of components using useAuth()
    setToken(token);
    setUser(user);
    setRole(role);
  };

  // ════════════════════════════════════════════════
  // logout() — Clears all auth data
  // Called when user clicks logout or token expires
  // ════════════════════════════════════════════════
  const logout = () => {
    clearAuthData();
  };

  // ── Helper: clear all stored auth data ──────────
  const clearAuthData = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    // Clear React state
    setToken(null);
    setUser(null);
    setRole(null);
  };

  // ── Derived value: is user logged in? ───────────
  const isAuth = !!token; // true if token exists

  // ── Context value object ─────────────────────────
  // Everything we expose to child components
  const value = {
    user,
    role,
    token,
    loading,
    isAuth,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ════════════════════════════════════════════════
// useAuth — Custom Hook
// Clean way to consume the AuthContext
//
// Usage in any component:
//   const { user, role, login, logout, isAuth } = useAuth()
// ════════════════════════════════════════════════
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Guard: hook must be used inside AuthProvider
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};

export default AuthContext;