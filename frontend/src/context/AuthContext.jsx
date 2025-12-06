// ===========================
// AuthContext.js (FINAL)
// ===========================
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const API = "https://selt-t-backend.selt-3232.workers.dev";

  // ---------------------------
  // GLOBAL STATE
  // ---------------------------
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ---------------------------
  // API WRAPPER
  // ---------------------------
  const api = async (path, method = "GET", body = null) => {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API}${path}`, opts);
    return res.json();
  };

  // ---------------------------
  // LOAD USER FROM TOKEN
  // ---------------------------
  useEffect(() => {
    if (!token) return;

    try {
      const decoded = atob(token).split(":");
      const userId = decoded[0];
      if (!userId) return;

      api(`/api/admin/users`)
        .then((resp) => {
          if (resp.success && resp.users) {
            const u = resp.users.find((x) => String(x.id) === String(userId));
            if (u) setUser(u);
          }
        })
        .catch(() => {});
    } catch {}
  }, [token]);

  // ---------------------------
  // LOGIN (email/password)
  // ---------------------------
  const login = async ({ email, phone, password, role }) => {
    setLoading(true);
    setMessage("");

    const res = await api("/api/auth/login", "POST", {
      email,
      phone,
      password,
      role,
    });

    setLoading(false);

    if (!res.success) {
      setMessage(res.message);
      return false;
    }

    setUser(res.user);
    setToken(res.token);

    localStorage.setItem("token", res.token);
    setMessage("Login successful");

    return true;
  };

  // ---------------------------
  // SIGNUP
  // ---------------------------
  const signup = async (data) => {
    setLoading(true);
    setMessage("");

    const res = await api("/api/auth/signup", "POST", data);

    setLoading(false);
    setMessage(res.message);
    return res.success;
  };

  // ---------------------------
  // SEND OTP (mock)
  // ---------------------------
  const sendOtp = async (phone) => {
    setLoading(true);
    const res = await api("/api/auth/send-otp", "POST", { phone });
    setLoading(false);
    return res;
  };

  // ---------------------------
  // VERIFY OTP (mock)
  // ---------------------------
  const verifyOtp = async (phone, otp) => {
    setLoading(true);
    const res = await api("/api/auth/verify-otp", "POST", { phone, otp });
    setLoading(false);

    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem("token", res.token);
    }

    return res;
  };

  // ---------------------------
  // LOGOUT
  // ---------------------------
  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
  };

  // ---------------------------
  // ADMIN: GET ALL USERS
  // ---------------------------
  const getAllUsers = async () => {
    const res = await api("/api/admin/users");
    if (res.success) return res.users || [];
    return [];
  };

  // ---------------------------
  // ADMIN: CREATE USER
  // ---------------------------
  const createUser = async (data) => {
    setLoading(true);
    const res = await api("/api/admin/users", "POST", data);
    setLoading(false);
    return res;
  };

  // ---------------------------
  // ADMIN: UPDATE USER
  // ---------------------------
  const updateUser = async (id, data) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "PATCH", data);
    setLoading(false);
    return res;
  };

  // ---------------------------
  // ADMIN: APPROVE USER
  // ---------------------------
  const approveUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}/approve`, "PATCH");
    setLoading(false);
    return res;
  };

  // ---------------------------
  // ADMIN: DELETE USER
  // ---------------------------
  const deleteUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "DELETE");
    setLoading(false);
    return res;
  };

  // ============================================================
  // PERMISSION HELPERS (FRONTEND SAFETY LAYER)
  // ============================================================

  // ROLE CHECK
  const isAdmin = user?.role === "admin";
  const isMIS = user?.role === "mis";
  const isUserRole = user?.role === "user";

  // PAGE PERMISSION
  const canView = (pageName) => {
    const p = user?.permissions || {};
    if (isAdmin) return true; // admin unrestricted
    return p[pageName]?.view === true;
  };

  // EXPORT PERMISSION
  const canExport = (section) => {
    const p = user?.permissions || {};
    if (isAdmin) return true;
    return p[section]?.export === true;
  };

  // COMPANY ACCESS
  const canSeeCompany = (companyName) => {
    if (!user) return false;
    if (!user.companyLockEnabled) return true;
    return user.allowedCompanies?.includes(companyName);
  };

  // ============================================================
  // RETURN CONTEXT
  // ============================================================
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        message,

        login,
        signup,
        sendOtp,
        verifyOtp,
        logout,

        getAllUsers,
        createUser,
        updateUser,
        deleteUser,
        approveUser,

        isAdmin,
        isMIS,
        isUserRole,

        canView,
        canExport,
        canSeeCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
