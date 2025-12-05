// ===========================
// AuthContext.jsx (FINAL)
// ===========================
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext();
const API_BASE = "https://selt-t-backend.selt-3232.workers.dev";

// ---------- Default permissions ----------
const ALL_MODULES = [
  "dashboard",
  "reports",
  "hierarchy",
  "outstanding",
  "analyst",
  "messaging",
  "usermanagement",
  "setting",
  "helpsupport",
];

const buildFullPerms = () => {
  const p = {};
  ALL_MODULES.forEach((m) => {
    p[m] = {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
    };
  });
  return p;
};

const buildUserPerms = () => {
  const base = [
    "dashboard",
    "reports",
    "hierarchy",
    "outstanding",
    "analyst",
    "helpsupport",
  ];
  const p = {};
  ALL_MODULES.forEach((m) => {
    p[m] = {
      view: base.includes(m),
      create: false,
      edit: false,
      delete: false,
      export: false,
    };
  });
  return p;
};

const DEFAULT_PERMISSIONS_BY_ROLE = {
  admin: buildFullPerms(),
  mis: buildFullPerms(),
  user: buildUserPerms(),
};

const clonePerms = (role) =>
  JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS_BY_ROLE[role] || {}));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [partyGroups, setPartyGroups] = useState([]);

  // Generic API
  const api = useCallback(
    async (path, method = "GET", body = null) => {
      const opts = {
        method,
        headers: { "Content-Type": "application/json" },
      };

      if (token) opts.headers.Authorization = `Bearer ${token}`;
      if (body) opts.body = JSON.stringify(body);

      try {
        const res = await fetch(`${API_BASE}${path}`, opts);
        return await res.json();
      } catch (err) {
        return { success: false, message: "Server error", error: err };
      }
    },
    [token]
  );

  // Load companies + party groups
  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/companies`).then((r) => r.json()),
          fetch(`${API_BASE}/api/party-groups`).then((r) => r.json()),
        ]);

        if (cRes?.success) setCompanies(cRes.companies || []);
        if (pRes?.success) setPartyGroups(pRes.partyGroups || []);
      } catch (e) {
        console.log("Meta load error:", e);
      }
    })();
  }, []);

  // --------- Auto Login ---------
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    (async () => {
      const res = await api("/api/auth/me", "GET");
      if (!res.success || !res.user) {
        setUser(null);
        return;
      }

      const u = res.user;
      u.permissions = u.permissions || clonePerms(u.role);
      u.companyLockEnabled = !!u.companyLockEnabled;
      u.partyLockEnabled = !!u.partyLockEnabled;
      u.allowedCompanies = u.allowedCompanies || [];
      u.allowedPartyGroups = u.allowedPartyGroups || [];

      setUser(u);
    })();
  }, [token, api]);

  // LOGIN
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
      setMessage(res.message || "Login failed");
      return false;
    }

    const u = res.user;
    u.permissions = u.permissions || clonePerms(u.role);
    u.companyLockEnabled = !!u.companyLockEnabled;
    u.partyLockEnabled = !!u.partyLockEnabled;
    u.allowedCompanies = u.allowedCompanies || [];
    u.allowedPartyGroups = u.allowedPartyGroups || [];

    setUser(u);
    setToken(res.token);
    localStorage.setItem("token", res.token);

    return true;
  };

  // SIGNUP
  const signup = (data) => api("/api/auth/signup", "POST", data);

  // OTP
  const sendOtp = (phone) => api("/api/auth/send-otp", "POST", { phone });
  const verifyOtp = async (phone, otp) => {
    const res = await api("/api/auth/verify-otp", "POST", { phone, otp });

    if (res.success && res.user && res.token) {
      const u = res.user;
      u.permissions = u.permissions || clonePerms(u.role);
      u.companyLockEnabled = !!u.companyLockEnabled;
      u.partyLockEnabled = !!u.partyLockEnabled;
      u.allowedCompanies = u.allowedCompanies || [];
      u.allowedPartyGroups = u.allowedPartyGroups || [];

      setUser(u);
      setToken(res.token);
      localStorage.setItem("token", res.token);
    }

    return res;
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
  };

  // --------- ADMIN USERS CRUD ---------
  const fetchUsers = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "mis")) return;

    const res = await api("/api/admin/users");

    if (res.success && Array.isArray(res.users)) {
      setUsers(
        res.users.map((u) => ({
          ...u,
          permissions: u.permissions || clonePerms(u.role),
          companyLockEnabled: !!u.companyLockEnabled,
          partyLockEnabled: !!u.partyLockEnabled,
          allowedCompanies: u.allowedCompanies || [],
          allowedPartyGroups: u.allowedPartyGroups || [],
        }))
      );
    }
  }, [user, api]);

  const createUser = (data) =>
    api("/api/admin/users", "POST", {
      ...data,
      permissions: data.permissions || clonePerms(data.role || "user"),
    });

  const updateUserData = (id, data) =>
    api(`/api/admin/users/${id}`, "PATCH", data);

  const approveUser = (id) =>
    api(`/api/admin/users/${id}/approve`, "PATCH");

  const deleteUser = (id) => api(`/api/admin/users/${id}`, "DELETE");

  // Permission checks
  const isAdmin = user?.role === "admin";
  const isMIS = user?.role === "mis";

  const canAccess = (moduleKey) => {
    if (!user) return false;
    if (isAdmin || isMIS) return true;
    return !!user.permissions?.[moduleKey]?.view;
  };

  const canExport = (moduleKey) => {
    if (!user) return false;
    if (isAdmin || isMIS) return true;
    return !!user.permissions?.[moduleKey]?.export;
  };

  const canSeeCompany = (name) => {
    if (!user) return false;
    if (!user.companyLockEnabled) return true;
    return user.allowedCompanies?.includes(name);
  };

  const canSeePartyGroup = (pg) => {
    if (!user) return false;
    if (!user.partyLockEnabled) return true;
    return user.allowedPartyGroups?.includes(pg);
  };

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

        users,
        fetchUsers,
        createUser,
        updateUserData,
        approveUser,
        deleteUser,

        companies,
        partyGroups,

        isAdmin,
        isMIS,
        canAccess,
        canExport,
        canSeeCompany,
        canSeePartyGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
