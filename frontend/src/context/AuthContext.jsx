// ===========================
// AuthContext.js (FINAL STABLE VERSION)
// ===========================
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const API = "https://selt-t-backend.selt-3232.workers.dev";

  // GLOBAL STATES
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [partyGroups, setPartyGroups] = useState([]);

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ============================================================
  // GENERIC API WRAPPER
  // ============================================================
  const api = async (path, method = "GET", body = null) => {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API}${path}`, opts);
    return res.json();
  };

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async ({ email, phone, password }) => {
    setLoading(true);
    setMessage("");

    const res = await api("/api/auth/login", "POST", {
      email,
      phone,
      password,
    });

    setLoading(false);

    if (!res.success) {
      setMessage(res.message || "Login failed");
      return false;
    }

    // SAVE LOGIN DATA
    setUser(res.user);
    setToken(res.token);

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));

    return true;
  };

  // ============================================================
  // SIGNUP
  // ============================================================
  const signup = async (data) => {
    setLoading(true);
    setMessage("");

    const res = await api("/api/auth/signup", "POST", data);

    setLoading(false);
    setMessage(res.message);

    return res.success;
  };

  // ============================================================
  // OTP FLOW
  // ============================================================
  const sendOtp = async (phone) => {
    return api("/api/auth/send-otp", "POST", { phone });
  };

  const verifyOtp = async (phone, otp) => {
    setLoading(true);
    const res = await api("/api/auth/verify-otp", "POST", { phone, otp });
    setLoading(false);

    if (res.success) {
      setUser(res.user);
      setToken(res.token);

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }

    return res;
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // ============================================================
  // META: COMPANIES + PARTY GROUPS
  // ============================================================
  const fetchMeta = async () => {
    try {
      const c = await api("/api/companies");
      const p = await api("/api/party-groups");

      if (c.success) setCompanies(c.companies || []);
      if (p.success) setPartyGroups(p.partyGroups || []);
    } catch (e) {
      console.log("Meta fetch failed:", e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMeta();
    }
  }, [token]);

  // ============================================================
  // ADMIN — USER CONTROL
  // ============================================================
  const fetchUsers = async () => {
    const res = await api("/api/admin/users");
    if (res.success) {
      setUsers(res.users || []);
      return res.users;
    }
    return [];
  };

  const createUser = async (data) => {
    setLoading(true);
    const res = await api("/api/admin/users", "POST", data);
    setLoading(false);

    if (res.success) fetchUsers();
    return res;
  };

  const updateUser = async (id, data) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "PATCH", data);
    setLoading(false);

    if (res.success) fetchUsers();
    return res;
  };

  const updateUserData = updateUser;

  const approveUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}/approve`, "PATCH");
    setLoading(false);

    if (res.success) fetchUsers();
    return res;
  };

  const deleteUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "DELETE");
    setLoading(false);

    if (res.success) fetchUsers();
    return res;
  };

  // ============================================================
  // PERMISSIONS
  // ============================================================
  const isAdmin = user?.role === "admin";
  const isMIS = user?.role === "mis";
  const isUserRole = user?.role === "user";

  const canView = (page) => {
    if (isAdmin) return true;
    return user?.permissions?.[page]?.view === true;
  };

  const canAccess = canView;

  const canExport = (section) => {
    if (isAdmin) return true;
    return user?.permissions?.[section]?.export === true;
  };

  const canSeeCompany = (companyName) => {
    if (!user) return false;
    if (!user.companyLockEnabled) return true;
    return user.allowedCompanies?.includes(companyName);
  };

  // ============================================================
  // CONTEXT RETURN
  // ============================================================
  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        token,
        loading,
        message,

        login,
        signup,
        sendOtp,
        verifyOtp,
        logout,

        fetchUsers,
        createUser,
        updateUser,
        updateUserData,
        approveUser,
        deleteUser,

        companies,
        partyGroups,

        isAdmin,
        isMIS,
        isUserRole,
        canView,
        canAccess,
        canExport,
        canSeeCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
