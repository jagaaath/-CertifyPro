// ============================================
// Axios Instance
// Pre-configured HTTP client for all API calls
//
// Features:
//   - Base URL from environment variable
//   - Request interceptor: auto-attach JWT token
//   - Response interceptor: handle 401 globally
//
// Usage in components:
//   import axiosInstance from '../api/axios'
//   const res = await axiosInstance.get('/student/profile')
// ============================================

import axios from "axios";

// ── Create a custom Axios instance ────────────
// This lets us set defaults once and reuse everywhere
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // http://localhost:5000/api
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 second timeout for slow connections
});

// ════════════════════════════════════════════════
// REQUEST INTERCEPTOR
// Runs before EVERY request is sent
// Automatically attaches the JWT token to headers
// So we never have to manually add it in components
// ════════════════════════════════════════════════
axiosInstance.interceptors.request.use(
  (config) => {
    // Read token from localStorage
    // (We store it there during login)
    const token = localStorage.getItem("token");

    if (token) {
      // Attach token in the Authorization header
      // Backend's protect middleware reads this
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // Return modified config to proceed
  },
  (error) => {
    // Request setup failed — reject the promise
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════════
// RESPONSE INTERCEPTOR
// Runs after EVERY response is received
// Handles global errors like token expiry
// ════════════════════════════════════════════════
axiosInstance.interceptors.response.use(
  (response) => {
    // 2xx responses — just return them normally
    return response;
  },
  (error) => {
    // ── Handle 401 Unauthorized ──────────────────
    // This happens when the token is expired or invalid
    // Automatically log the user out and redirect to home
    if (error.response?.status === 401) {
      // Clear all stored auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      // Redirect to home page (login selection)
      // Only redirect if not already on the home page
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    // For all other errors, reject so components
    // can handle them in their own try/catch blocks
    return Promise.reject(error);
  }
);

export default axiosInstance;