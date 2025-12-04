// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// अपने backend का URL यहाँ रखो
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://selt-t-backend.selt-3232.workers.dev";

const TOKEN_KEY = "sel_t_token";
const CURRENT_USER_KEY = "sel_t_current_user";
const LAST_ACTIVITY_KEY = "sel_t_last_activity";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "API Error");
  return data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);          // logged-in user
  const [users, setUsers] = useState([]);          // all users for UserManagement
  const [notifications, setNotifications] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // ---------------------------
  // INITIAL LOAD + AUTO-LOGIN
  // ---------------------------
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
      const token = localStorage.getItem(TOKEN_KEY);
      if (storedUser && token) {
        setUser(storedUser);
      }
    } catch (err) {
      console.error("Auth load error:", err);
    } finally {
      setInitialized(true);
    }
  }, []);

  // ---------------------------
  // AUTO LOGOUT (30 min idle + browser close)
  // ---------------------------
  useEffect(() => {
    if (!initialized) return;

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const checkInactivity = () => {
      const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
      if (!last || !user) return;
      const diff = Date.now() - last;
      const THIRTY_MIN = 30 * 60 * 1000;
      if (diff > THIRTY_MIN) {
        console.log("Auto-logout due to inactivity");
        logout();
      }
    };

    // activity events
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // browser close → clear session
    const handleBeforeUnload = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // initial
    updateActivity();
    const interval = setInterval(checkInactivity, 60 * 1000); // हर 1 मिनट में check

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user]);

  const saveSession = (loggedUser, token) => {
    setUser(loggedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedUser));
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  // ---------------------------
  // AUTH FUNCTIONS
  // ---------------------------

  // Email + password login (अब backend से)
  const login = async (emailOrPhone, password) => {
    try {
      const body = { identifier: emailOrPhone.trim(), password: password.trim() };
      const data = await api("/api/auth/login-email", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.success) {
        return { success: false, message: data.message || "Invalid credentials" };
      }

      saveSession(data.user, data.token);
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
      }
      return { success: true, user: data.user };
    } catch (err) {
      console.error("login error:", err);
      return { success: false, message: err.message || "Login failed" };
    }
  };

  // Phone OTP – mock: OTP backend generate करेगा और response में वापस देगा
  const sendOTP = async (phone) => {
    try {
      const data = await api("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      });

      if (!data.success) {
        return { success: false, message: data.message || "Failed to send OTP" };
      }

      // MOCK: OTP को UI / console में दिखाने के लिए वापस भेज रहे हैं
      console.log("📱 MOCK OTP for", phone, "is", data.otp);
      return { success: true, message: "OTP sent", otp: data.otp };
    } catch (err) {
      console.error("sendOTP error:", err);
      return { success: false, message: err.message || "Failed to send OTP" };
    }
  };

  const verifyOTP = async (phone, otp) => {
    try {
      const data = await api("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });

      if (!data.success) {
        return { success: false, message: data.message || "Invalid OTP" };
      }

      if (data.status === "pending") {
        return { success: false, message: "Account pending approval" };
      }

      saveSession(data.user, data.token);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("verifyOTP error:", err);
      return { success: false, message: err.message || "OTP verification failed" };
    }
  };

  // Signup → pending user
  const signup = async (payload) => {
    try {
      const data = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data.success) {
        return { success: false, message: data.message || "Signup failed" };
      }

      // notification admin ke liye
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
      }

      return { success: true, message: data.message || "Account created. Wait for approval." };
    } catch (err) {
      console.error("signup error:", err);
      return { success: false, message: err.message || "Signup failed" };
    }
  };

  const logout = () => {
    clearSession();
  };

  // ---------------------------
  // ADMIN / MIS – USER MANAGEMENT
  // ---------------------------

  const fetchUsers = async () => {
    try {
      const data = await api("/api/admin/users", { method: "GET" });
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("fetchUsers error:", err);
    }
  };

  const createUser = async (form) => {
    try {
      const data = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!data.success) {
        return { success: false, message: data.message || "Failed to create user" };
      }
      setUsers((prev) => [...prev, data.user]);
      return { success: true, message: data.message || "User created successfully" };
    } catch (err) {
      console.error("createUser error:", err);
      return { success: false, message: err.message || "Failed to create user" };
    }
  };

  const approveUser = async (id) => {
    try {
      const data = await api(`/api/admin/users/${id}/approve`, {
        method: "PATCH",
      });
      if (!data.success) return;

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "active" } : u))
      );
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
      }
    } catch (err) {
      console.error("approveUser error:", err);
    }
  };

  const updateUserData = async (userId, updates) => {
    try {
      const data = await api(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!data.success) {
        return { success: false, message: data.message || "Update failed" };
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );

      if (user && user.id === userId) {
        setUser(data.user);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      }

      return { success: true, message: data.message || "User updated" };
    } catch (err) {
      console.error("updateUserData error:", err);
      return { success: false, message: err.message || "Update failed" };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const data = await api(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!data.success) {
        return { success: false, message: data.message || "Delete failed" };
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return { success: true, message: data.message || "User deleted" };
    } catch (err) {
      console.error("deleteUser error:", err);
      return { success: false, message: err.message || "Delete failed" };
    }
  };

  // ---------------------------
  // PERMISSION HELPERS
  // ---------------------------
  const isPowerUser = user?.role === "admin" || user?.role === "mis";

  const canAccess = (module) => {
    if (!user) return false;
    if (isPowerUser) return true;
    return !!user.permissions?.[module]?.view;
  };
  const canCreate = (module) => {
    if (!user) return false;
    if (isPowerUser) return true;
    return !!user.permissions?.[module]?.create;
  };
  const canEdit = (module) => {
    if (!user) return false;
    if (isPowerUser) return true;
    return !!user.permissions?.[module]?.edit;
  };
  const canDelete = (module) => {
    if (!user) return false;
    if (isPowerUser) return true;
    return !!user.permissions?.[module]?.delete;
  };
  const canExport = (module) => {
    if (!user) return false;
    if (isPowerUser) return true;
    return !!user.permissions?.[module]?.export;
  };

  const visibleNotifications = user ? notifications : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications: visibleNotifications,
        login,
        sendOTP,
        verifyOTP,
        signup,
        createUser,
        logout,
        approveUser,
        updateUserData,
        deleteUser,
        canAccess,
        canCreate,
        canEdit,
        canDelete,
        canExport,
        fetchUsers,
      }}
    >
      {initialized && children}
    </AuthContext.Provider>
  );
};
