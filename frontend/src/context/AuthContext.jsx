// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Backend Base URL
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://selt-t-backend.selt-3232.workers.dev";

const TOKEN_KEY = "sel_t_token";
const CURRENT_USER_KEY = "sel_t_current_user";
const LAST_ACTIVITY_KEY = "sel_t_last_activity";

// Generic API wrapper
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  return data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // AUTO LOAD SESSION
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (saved && token) {
      setUser(JSON.parse(saved));
    }

    setInitialized(true);
  }, []);

  // ACTIVITY + AUTO LOGOUT
  useEffect(() => {
    if (!initialized) return;

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const checkInactivity = () => {
      const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
      if (!last || !user) return;

      const diff = Date.now() - last;
      const MAX = 30 * 60 * 1000;

      if (diff > MAX) logout();
    };

    updateActivity();
    const interval = setInterval(checkInactivity, 60000);

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [initialized, user]);

  const saveSession = (u, token) => {
    setUser(u);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  // --------------------------
  // FIXED LOGIN (FINAL)
  // --------------------------
  const login = async (email, password, role) => {
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          role,
        }),
      });

      if (!data.success) {
        return { success: false, message: data.message || "Invalid login" };
      }

      saveSession(data.user, data.token);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: "Server error" };
    }
  };

  // --------------------------
  // FIXED OTP (Mock system)
  // --------------------------

  const sendOTP = async (phone) => {
    const data = await api("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });

    return data;
  };

  const verifyOTP = async (phone, otp) => {
    const data = await api("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });

    if (data.success) {
      saveSession(data.user, data.token);
    }

    return data;
  };

  // --------------------------
  // FIXED SIGNUP
  // --------------------------

  const signup = async (payload) => {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return data;
  };

  // --------------------------
  // LOGOUT
  // --------------------------
  const logout = () => clearSession();

  // --------------------------
  // ADMIN USER MANAGEMENT (UNCHANGED)
  // --------------------------

  const fetchUsers = async () => {
    const data = await api("/api/admin/users");
    if (data.success) setUsers(data.users || []);
  };

  const createUser = async (form) => {
    const data = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    return data;
  };

  const approveUser = async (id) => {
    const data = await api(`/api/admin/users/${id}/approve`, {
      method: "PATCH",
    });
    return data;
  };

  const updateUserData = async (id, updates) => {
    const data = await api(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return data;
  };

  const deleteUser = async (id) => {
    return await api(`/api/admin/users/${id}`, { method: "DELETE" });
  };

  // --------------------------
  // PERMISSION HELPERS
  // --------------------------
  const isPowerUser = user?.role === "admin" || user?.role === "mis";

  const canAccess = (module) => {
    if (isPowerUser) return true;
    return user?.permissions?.[module]?.view || false;
  };

  const canCreate = (module) => {
    if (isPowerUser) return true;
    return user?.permissions?.[module]?.create || false;
  };

  const canEdit = (module) => {
    if (isPowerUser) return true;
    return user?.permissions?.[module]?.edit || false;
  };

  const canDelete = (module) => {
    if (isPowerUser) return true;
    return user?.permissions?.[module]?.delete || false;
  };

  const canExport = (module) => {
    if (isPowerUser) return true;
    return user?.permissions?.[module]?.export || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications,
        login,
        signup,
        sendOTP,
        verifyOTP,
        logout,
        fetchUsers,
        createUser,
        approveUser,
        updateUserData,
        deleteUser,
        canAccess,
        canCreate,
        canEdit,
        canDelete,
        canExport,
      }}
    >
      {initialized && children}
    </AuthContext.Provider>
  );
};
