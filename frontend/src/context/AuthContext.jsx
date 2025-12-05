// ===========================
// AuthContext.jsx  (FINAL)
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

// ------- Default permissions by role ---------
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
  const perms = {};
  ALL_MODULES.forEach((m) => {
    perms[m] = {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
    };
  });
  return perms;
};

const buildUserPerms = () => {
  const baseViewModules = [
    "dashboard",
    "reports",
    "hierarchy",
    "outstanding",
    "analyst",
    "helpsupport",
  ];
  const perms = {};
  ALL_MODULES.forEach((m) => {
    const canView = baseViewModules.includes(m);
    perms[m] = {
      view: canView,
      create: false,
      edit: false,
      delete: false,
      export: false,
    };
  });
  return perms;
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
  const [notifications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [partyGroups, setPartyGroups] = useState([]);

  // ---------------------------
  // Generic API helper
  // ---------------------------
  const api = useCallback(
    async (path, method = "GET", body = null) => {
      const opts = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      if (token) {
        opts.headers["Authorization"] = `Bearer ${token}`;
      }
      if (body) {
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(`${API_BASE}${path}`, opts);
      try {
        return await res.json();
      } catch {
        return { success: false, message: "Invalid server response" };
      }
    },
    [token]
  );

  // ---------------------------
  // Load meta: companies + party groups
  // ---------------------------
  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/companies`).then((r) => r.json()),
          fetch(`${API_BASE}/api/party-groups`).then((r) => r.json()).catch(() => ({})),
        ]);

        if (cRes?.success) {
          setCompanies(cRes.companies || []);
        }
        if (pRes?.success) {
          setPartyGroups(pRes.partyGroups || []);
        }
      } catch (err) {
        console.log("Meta load failed:", err);
      }
    })();
  }, []);

  // ---------------------------
  // Load current user from token
  // ---------------------------
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    // Simple decode: token = base64("id:timestamp")  (जो पहले use किया था)
    let userId = null;
    try {
      const decoded = atob(token);
      userId = decoded.split(":")[0];
    } catch (e) {
      console.log("Token decode failed", e);
    }
    if (!userId) return;

    (async () => {
      const resp = await api("/api/admin/users");
      if (resp.success && Array.isArray(resp.users)) {
        const u = resp.users.find((x) => String(x.id) === String(userId));
        if (u) {
          if (!u.permissions) {
            u.permissions = clonePerms(u.role);
          }
          // default locks if missing
          u.companyLockEnabled = !!u.companyLockEnabled;
          u.partyLockEnabled = !!u.partyLockEnabled;
          u.allowedCompanies = u.allowedCompanies || [];
          u.allowedPartyGroups = u.allowedPartyGroups || [];
          setUser(u);
        }
        setUsers(resp.users);
      }
    })();
  }, [token, api]);

  // ---------------------------
  // LOGIN
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
      setMessage(res.message || "Login failed");
      return false;
    }

    let u = res.user || null;
    if (!u) {
      setMessage("Invalid login response");
      return false;
    }

    if (!u.permissions) {
      u.permissions = clonePerms(u.role);
    }
    u.companyLockEnabled = !!u.companyLockEnabled;
    u.partyLockEnabled = !!u.partyLockEnabled;
    u.allowedCompanies = u.allowedCompanies || [];
    u.allowedPartyGroups = u.allowedPartyGroups || [];

    setUser(u);
    setToken(res.token || "");
    if (res.token) localStorage.setItem("token", res.token);

    setMessage("Login successful");
    return true;
  };

  // ---------------------------
  // SIGNUP (public)
  // ---------------------------
  const signup = async (data) => {
    setLoading(true);
    setMessage("");

    const res = await api("/api/auth/signup", "POST", data);

    setLoading(false);
    setMessage(res.message || "");
    return !!res.success;
  };

  // ---------------------------
  // OTP helpers ( अगर backend में बने हों )
  // ---------------------------
  const sendOtp = async (phone) => {
    setLoading(true);
    const res = await api("/api/auth/send-otp", "POST", { phone });
    setLoading(false);
    return res;
  };

  const verifyOtp = async (phone, otp) => {
    setLoading(true);
    const res = await api("/api/auth/verify-otp", "POST", { phone, otp });
    setLoading(false);

    if (res.success && res.user && res.token) {
      let u = res.user;
      if (!u.permissions) {
        u.permissions = clonePerms(u.role);
      }
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

  // ---------------------------
  // LOGOUT
  // ---------------------------
  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
  };

  // ---------------------------
  // ADMIN: USERS CRUD
  // ---------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await api("/api/admin/users");
    setLoading(false);
    if (res.success && Array.isArray(res.users)) {
      const list = res.users.map((u) => ({
        ...u,
        permissions: u.permissions || clonePerms(u.role),
        companyLockEnabled: !!u.companyLockEnabled,
        partyLockEnabled: !!u.partyLockEnabled,
        allowedCompanies: u.allowedCompanies || [],
        allowedPartyGroups: u.allowedPartyGroups || [],
      }));
      setUsers(list);
    }
  }, [api]);

  const createUser = async (data) => {
    setLoading(true);
    const payload = {
      ...data,
      permissions: data.permissions || clonePerms(data.role || "user"),
    };
    const res = await api("/api/admin/users", "POST", payload);
    setLoading(false);

    if (res.success) {
      // अगर backend user return करे तो use, वरना payload से approximate बना दो
      const newUser = res.user || {
        id: res.id,
        ...payload,
      };
      setUsers((prev) => [...prev, newUser]);
    }
    return res;
  };

  const updateUserData = async (id, data) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "PATCH", data);
    setLoading(false);

    if (res.success) {
      const updated = res.user || null;
      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(id)
            ? {
                ...u,
                ...(updated || data),
              }
            : u
        )
      );
    }
    return res;
  };

  const approveUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}/approve`, "PATCH");
    setLoading(false);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(id) ? { ...u, status: "active" } : u
        )
      );
    }
    return res;
  };

  const deleteUser = async (id) => {
    setLoading(true);
    const res = await api(`/api/admin/users/${id}`, "DELETE");
    setLoading(false);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
    }
    return res;
  };

  // ---------------------------
  // Permission helpers
  // ---------------------------
  const isAdmin = user?.role === "admin";
  const isMIS = user?.role === "mis";
  const isUserRole = user?.role === "user";

  const canAccess = (moduleKey) => {
    if (!user) return false;
    if (isAdmin || isMIS) return true;
    return !!user.permissions?.[moduleKey]?.view;
  };

  const canView = canAccess;

  const canExport = (moduleKey) => {
    if (!user) return false;
    if (isAdmin || isMIS) return true;
    return !!user.permissions?.[moduleKey]?.export;
  };

  const canSeeCompany = (companyName) => {
    if (!user) return false;
    if (!user.companyLockEnabled) return true; // no lock => all
    return (user.allowedCompanies || []).includes(companyName);
  };

  const canSeePartyGroup = (partyGroupName) => {
    if (!user) return false;
    if (!user.partyLockEnabled) return true;
    return (user.allowedPartyGroups || []).includes(partyGroupName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        message,

        notifications,

        login,
        signup,
        sendOtp,
        verifyOtp,
        logout,

        users,
        fetchUsers,
        createUser,
        updateUserData,
        deleteUser,
        approveUser,

        companies,
        partyGroups,

        isAdmin,
        isMIS,
        isUserRole,

        canAccess,
        canView,
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
