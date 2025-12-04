import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Backend URL
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://selt-t-backend.selt-3232.workers.dev";

const TOKEN_KEY = "sel_t_token";
const CURRENT_USER_KEY = "sel_t_current_user";
const LAST_ACTIVITY_KEY = "sel_t_last_activity";

// Generic API Caller
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
  const [user, setUser] = useState(null);          // current logged-in user
  const [users, setUsers] = useState([]);          // all users for admin/mis
  const [notifications, setNotifications] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // master list of companies (item categories) – optional
  const [allCompanies, setAllCompanies] = useState([]);

  // ---------------------------------------------
  // LOAD SESSION
  // ---------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (saved && token) {
      setUser(JSON.parse(saved));
    }

    setInitialized(true);
  }, []);

  // ---------------------------------------------
  // INACTIVITY AUTO-LOGOUT
  // ---------------------------------------------
  useEffect(() => {
    if (!initialized) return;

    const updateActivity = () =>
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    const checkInactivity = () => {
      const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0");
      if (!last || !user) return;

      const diff = Date.now() - last;
      const MAX = 30 * 60 * 1000; // 30 min

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

  // =========================================================
  // LOGIN — EMAIL + PASSWORD + ROLE  (Matches Backend v6.0)
  // =========================================================
  // identifier = email या phone दोनों हो सकता है
  const login = async (identifier, password, role) => {
    try {
      const data = await api("/api/auth/login-email", {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
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

  // =========================================================
  // OTP SEND + VERIFY
  // =========================================================
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

    if (data.success) saveSession(data.user, data.token);

    return data;
  };

  // =========================================================
  // SIGNUP
  // =========================================================
  const signup = async (payload) => {
    return await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  // =========================================================
  // LOGOUT
  // =========================================================
  const logout = () => clearSession();

  // =========================================================
  // USER MANAGEMENT — SYNCED WITH BACKEND v6.0
  // =========================================================

  const fetchUsers = async () => {
    const data = await api("/api/admin/users");
    if (data.success) setUsers(data.users || []);
  };

  const createUser = async (form) => {
    // form: { name, email, phone, password, role, loginMethod, companyLockEnabled, allowedCompanies }
    return await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
  };

  const approveUser = async (id) => {
    return await api(`/api/admin/users/${id}/approve`, {
      method: "POST",
    });
  };

  const updateUserData = async (id, updates) => {
    return await api(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  };

  const deleteUser = async (id) => {
    return await api(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  };

  // =========================================================
  // COMPANIES (ITEM CATEGORY) LIST — OPTIONAL
  // =========================================================
  // backend में /api/companies हो तो ये चलेगा, नहीं हो तो बस empty रहेगा
  const fetchCompanies = async () => {
    try {
      const data = await api("/api/companies");
      if (data.success && Array.isArray(data.companies)) {
        setAllCompanies(data.companies);
      }
    } catch (err) {
      // silent fail, बाकी data पर कोई असर नहीं
      console.error("fetchCompanies error:", err);
    }
  };

  // =========================================================
  // PERMISSION CHECKS
  // =========================================================
  const isPowerUser = user?.role === "admin" || user?.role === "mis";

  const canAccess = (module) =>
    isPowerUser ? true : user?.permissions?.[module]?.view || false;

  const canCreate = (module) =>
    isPowerUser ? true : user?.permissions?.[module]?.create || false;

  const canEdit = (module) =>
    isPowerUser ? true : user?.permissions?.[module]?.edit || false;

  const canDelete = (module) =>
    isPowerUser ? true : user?.permissions?.[module]?.delete || false;

  const canExport = (module) =>
    isPowerUser ? true : user?.permissions?.[module]?.export || false;

  // =========================================================
  // COMPANY ACCESS HELPERS (item category based)
  // =========================================================
  // company = item_category / brand name etc.
  const hasCompanyAccess = (companyName) => {
    if (!user) return false;
    if (!user.companyLockEnabled) return true; // no lock → all companies
    const list = user.allowedCompanies || [];
    if (!Array.isArray(list) || list.length === 0) return true;
    return list.includes(companyName);
  };

  // किसी भी data array पर company-wise filter लगाने के लिए helper
  // item[itemCompanyField] e.g. "item_category"
  const filterDataByCompany = (data, itemCompanyField = "item_category") => {
    if (!Array.isArray(data)) return [];
    if (!user || !user.companyLockEnabled) return data;

    const list = user.allowedCompanies || [];
    if (!Array.isArray(list) || list.length === 0) return data;

    return data.filter((row) => {
      const c = row?.[itemCompanyField];
      if (!c) return false;
      return list.includes(c);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications,

        // auth
        login,
        signup,
        sendOTP,
        verifyOTP,
        logout,

        // user management
        fetchUsers,
        createUser,
        approveUser,
        updateUserData,
        deleteUser,

        // permissions
        canAccess,
        canCreate,
        canEdit,
        canDelete,
        canExport,
        isPowerUser,

        // companies / item categories
        allCompanies,
        fetchCompanies,
        hasCompanyAccess,
        filterDataByCompany,
      }}
    >
      {initialized && children}
    </AuthContext.Provider>
  );
};
