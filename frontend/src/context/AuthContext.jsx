// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [initialized, setInitialized] = useState(false);

  const STORAGE_KEY = "sel_t_users";
  const CURRENT_USER_KEY = "sel_t_current_user";
  const NOTIFY_KEY = "sel_t_notifications";

  // Load data
  useEffect(() => {
    try {
      const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      const storedUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
      const storedNotifies = JSON.parse(localStorage.getItem(NOTIFY_KEY)) || [];

      setUsers(storedUsers);
      setNotifications(storedNotifies);
      setUser(storedUser);
    } catch (err) {
      console.error("❌ Auth load error:", err);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Save function
  const saveAll = (updatedUsers, updatedNotifies, loggedUser = user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(updatedNotifies));
    if (loggedUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedUser));
  };

  // Auto create default users
  useEffect(() => {
    if (initialized && users.length === 0) {
      const defaultUsers = [
        {
          id: "admin-1",
          name: "Main Admin",
          email: "admin@cw",
          password: "admin@3232",
          role: "admin",
          loginMethod: "email", // email or phone
          phone: "",
          company: "All",
          status: "active",
          permissions: {
            dashboard: { view: true, create: true, edit: true, delete: true, export: true },
            reports: { view: true, create: true, edit: true, delete: true, export: true },
            hierarchy: { view: true, create: true, edit: true, delete: true, export: true },
            outstanding: { view: true, create: true, edit: true, delete: true, export: true },
            analyst: { view: true, create: true, edit: true, delete: true, export: true },
            messaging: { view: true, create: true, edit: true, delete: true, export: true },
            usermanagement: { view: true, create: true, edit: true, delete: true, export: true },
            setting: { view: true, create: true, edit: true, delete: true, export: true },
            helpsupport: { view: true, create: true, edit: true, delete: true, export: true },
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "mis-1",
          name: "MIS User",
          email: "mis@cw",
          password: "mis@3232",
          role: "mis",
          loginMethod: "email",
          phone: "",
          company: "All",
          status: "active",
          permissions: {
            dashboard: { view: true, create: true, edit: true, delete: true, export: true },
            reports: { view: true, create: true, edit: true, delete: true, export: true },
            hierarchy: { view: true, create: true, edit: true, delete: true, export: true },
            outstanding: { view: true, create: true, edit: true, delete: true, export: true },
            analyst: { view: true, create: true, edit: true, delete: true, export: true },
            messaging: { view: true, create: true, edit: true, delete: true, export: true },
            usermanagement: { view: true, create: true, edit: true, delete: true, export: true },
            setting: { view: true, create: true, edit: true, delete: true, export: true },
            helpsupport: { view: true, create: true, edit: true, delete: true, export: true },
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "user-1",
          name: "Demo User",
          email: "user@cw",
          password: "user@3232",
          role: "user",
          loginMethod: "email",
          phone: "",
          company: "Demo Company",
          status: "active",
          permissions: {
            dashboard: { view: true, create: false, edit: false, delete: false, export: false },
            reports: { view: true, create: false, edit: false, delete: false, export: true },
            hierarchy: { view: false, create: false, edit: false, delete: false, export: false },
            outstanding: { view: true, create: false, edit: false, delete: false, export: false },
            analyst: { view: false, create: false, edit: false, delete: false, export: false },
            messaging: { view: true, create: false, edit: false, delete: false, export: false },
            usermanagement: { view: false, create: false, edit: false, delete: false, export: false },
            setting: { view: false, create: false, edit: false, delete: false, export: false },
            helpsupport: { view: true, create: false, edit: false, delete: false, export: false },
          },
          createdAt: new Date().toISOString(),
        },
      ];

      setUsers(defaultUsers);
      saveAll(defaultUsers, notifications);
      console.log("✅ Default users created");
    }
  }, [initialized, users, notifications]);

  /* 🔐 LOGIN */
  const login = (emailOrPhone, password) => {
    const found = users.find((u) => {
      if (u.loginMethod === "email") {
        return u.email === emailOrPhone && u.password === password;
      } else if (u.loginMethod === "phone") {
        return u.phone === emailOrPhone && u.password === password;
      }
      return false;
    });

    if (!found) {
      return { success: false, message: "Invalid credentials" };
    }

    if (found.status !== "active") {
      return {
        success: false,
        message: "Account is under review. Contact admin.",
      };
    }

    setUser(found);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    return { success: true, user: found };
  };

  /* 📱 OTP LOGIN (Mock - replace with real SMS API) */
  const sendOTP = (phone) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📱 OTP for ${phone}: ${otp}`);
    localStorage.setItem(`otp_${phone}`, otp);
    return { success: true, message: "OTP sent successfully" };
  };

  const verifyOTP = (phone, otp) => {
    const savedOTP = localStorage.getItem(`otp_${phone}`);
    if (savedOTP === otp) {
      const found = users.find((u) => u.phone === phone);
      if (found && found.status === "active") {
        setUser(found);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
        localStorage.removeItem(`otp_${phone}`);
        return { success: true, user: found };
      }
    }
    return { success: false, message: "Invalid OTP" };
  };

  /* 🧾 SIGNUP */
  const signup = ({ name, email, password, company, phone, loginMethod }) => {
    const exists = users.find((u) => u.email === email || u.phone === phone);
    if (exists) {
      return { success: false, message: "Email or Phone already registered." };
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email: email || "",
      phone: phone || "",
      password,
      loginMethod: loginMethod || "email",
      role: "user",
      company: company || "General",
      status: "pending",
      permissions: {
        dashboard: { view: false, create: false, edit: false, delete: false, export: false },
        reports: { view: false, create: false, edit: false, delete: false, export: false },
        hierarchy: { view: false, create: false, edit: false, delete: false, export: false },
        outstanding: { view: false, create: false, edit: false, delete: false, export: false },
        analyst: { view: false, create: false, edit: false, delete: false, export: false },
        messaging: { view: false, create: false, edit: false, delete: false, export: false },
        usermanagement: { view: false, create: false, edit: false, delete: false, export: false },
        setting: { view: false, create: false, edit: false, delete: false, export: false },
        helpsupport: { view: false, create: false, edit: false, delete: false, export: false },
      },
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    const notifyMsg = {
      message: `🆕 New Signup: ${name} (${email || phone})`,
      time: new Date().toISOString(),
    };
    const updatedNotifies = [notifyMsg, ...(notifications || [])];

    setUsers(updatedUsers);
    setNotifications(updatedNotifies);
    saveAll(updatedUsers, updatedNotifies, user);

    return {
      success: true,
      message: "✅ Signup successful! Wait for admin approval.",
    };
  };

  /* 🚪 LOGOUT */
  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  /* 🧩 ADMIN - Approve User */
  const approveUser = (id) => {
    const updated = users.map((u) => (u.id === id ? { ...u, status: "active" } : u));
    setUsers(updated);

    const approvedUser = updated.find((u) => u.id === id);
    const notifyMsg = {
      message: `✅ User Approved: ${approvedUser?.name}`,
      time: new Date().toISOString(),
    };

    const updatedNotifies = [notifyMsg, ...(notifications || [])];
    setNotifications(updatedNotifies);
    saveAll(updated, updatedNotifies, user);
  };

  /* 🔒 Permission Checking Functions */
  const canAccess = (module) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "mis") return true;
    return user.permissions?.[module]?.view || false;
  };

  const canCreate = (module) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "mis") return true;
    return user.permissions?.[module]?.create || false;
  };

  const canEdit = (module) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "mis") return true;
    return user.permissions?.[module]?.edit || false;
  };

  const canDelete = (module) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "mis") return true;
    return user.permissions?.[module]?.delete || false;
  };

  const canExport = (module) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "mis") return true;
    return user.permissions?.[module]?.export || false;
  };

  /* 👥 Update User (Admin/MIS only) */
  const updateUserData = (userId, updates) => {
    if (user?.role !== "admin" && user?.role !== "mis") {
      return { success: false, message: "Unauthorized" };
    }

    const updated = users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
    setUsers(updated);
    saveAll(updated, notifications, user);

    // If updating current user, refresh session
    if (userId === user.id) {
      const updatedCurrentUser = updated.find((u) => u.id === userId);
      setUser(updatedCurrentUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedCurrentUser));
    }

    return { success: true, message: "User updated" };
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
        logout,
        approveUser,
        updateUserData,
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
