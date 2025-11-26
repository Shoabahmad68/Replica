// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

// ✅ Context create
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ✅ Provider start
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // current logged user
  const [users, setUsers] = useState([]); // all users
  const [notifications, setNotifications] = useState([]); // all notifications
  const [initialized, setInitialized] = useState(false); // avoid auto logout flicker

  const STORAGE_KEY = "mars_users";
  const CURRENT_USER_KEY = "mars_current_user";
  const NOTIFY_KEY = "mars_notifications";

  // 🧠 Load all data from localStorage once
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

  // 💾 Save function
  const saveAll = (updatedUsers, updatedNotifies, loggedUser = user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(updatedNotifies));
    if (loggedUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedUser));
  };

  // 🧩 Auto Admin create (first time only)
  useEffect(() => {
    if (initialized && !users.find((u) => u.role === "admin")) {
      const adminUser = {
        id: "admin-1",
        name: "Main Admin",
        email: "admin@cw",
        password: "admin@3232",
        role: "admin",
        company: "All",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const updated = [...users, adminUser];
      setUsers(updated);
      saveAll(updated, notifications);
      console.log("✅ Default Admin created:", adminUser.email);
    }
  }, [initialized, users, notifications]);

  /* 🔐 LOGIN FUNCTION */
  const login = (email, password) => {
    const found = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!found) {
      return { success: false, message: "Invalid email or password" };
    }

    if (found.status !== "active") {
      return {
        success: false,
        message:
          "Your account is under review. You’ll be notified once it’s approved.",
      };
    }

    setUser(found);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));

    return { success: true, user: found };
  };

  /* 🧾 SIGNUP FUNCTION */
  const signup = ({ name, email, password, company }) => {
    const exists = users.find((u) => u.email === email);
    if (exists) {
      return { success: false, message: "Email already registered." };
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: "viewer",
      company: company || "General",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    const notifyMsg = {
      message: `🆕 New Signup Request: ${name} (${email})`,
      time: new Date().toISOString(),
    };
    const updatedNotifies = [notifyMsg, ...(notifications || [])];

    setUsers(updatedUsers);
    setNotifications(updatedNotifies);
    saveAll(updatedUsers, updatedNotifies, user);

    return {
      success: true,
      message:
        "✅ Signup successful! Your account will be reviewed within 24 hours.",
    };
  };

  /* 🚪 LOGOUT FUNCTION */
  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  /* 🧩 ADMIN FUNCTION — Approve Pending User */
  const approveUser = (id) => {
    const updated = users.map((u) =>
      u.id === id ? { ...u, status: "active" } : u
    );
    setUsers(updated);

    const approvedUser = updated.find((u) => u.id === id);
    const notifyMsg = {
      message: `✅ User Approved: ${approvedUser?.name || "Unknown User"}`,
      time: new Date().toISOString(),
    };

    const updatedNotifies = [notifyMsg, ...(notifications || [])];
    setNotifications(updatedNotifies);
    saveAll(updated, updatedNotifies, user);
  };

  /* 🏢 For Dashboard Filtering */
  const getCompanyDataFilter = () => {
    if (!user || user.role === "admin") return "All";
    return user.company || "General";
  };

  // ✅ Filter notifications → only show when logged in
  const visibleNotifications = user ? notifications : [];

  // 🚀 Final Provider return
  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications: visibleNotifications,
        login,
        signup,
        logout,
        approveUser,
        getCompanyDataFilter,
      }}
    >
      {initialized && children}
    </AuthContext.Provider>
  );
};
