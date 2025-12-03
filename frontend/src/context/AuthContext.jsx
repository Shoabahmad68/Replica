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

  const saveAll = (updatedUsers, updatedNotifies, loggedUser = user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(updatedNotifies));
    if (loggedUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedUser));
  };

  useEffect(() => {
    if (initialized && users.length === 0) {
      const defaultUsers = [
        {
          id: "admin-1",
          name: "Main Admin",
          email: "admin@cw",
          password: "admin@3232",
          role: "admin",
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
      return { success: false, message: "Account pending approval. Contact admin." };
    }

    setUser(found);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    return { success: true, user: found };
  };

  const sendOTP = (phone) => {
    const userExists = users.find((u) => u.phone === phone);
    if (!userExists) {
      return { success: false, message: "Phone number not registered" };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem(`otp_${phone}`, otp);
    localStorage.setItem(`otp_time_${phone}`, Date.now().toString());
    
    console.log(`📱 OTP sent to ${phone}: ${otp}`);
    alert(`📱 OTP for ${phone}: ${otp}\n\n(In production, this will be sent via SMS)`);
    
    return { success: true, message: "OTP sent successfully", otp };
  };

  const verifyOTP = (phone, otp) => {
    const savedOTP = localStorage.getItem(`otp_${phone}`);
    const otpTime = localStorage.getItem(`otp_time_${phone}`);
    
    if (!savedOTP) {
      return { success: false, message: "OTP not found. Request new OTP." };
    }

    const isExpired = Date.now() - parseInt(otpTime) > 300000;
    if (isExpired) {
      localStorage.removeItem(`otp_${phone}`);
      localStorage.removeItem(`otp_time_${phone}`);
      return { success: false, message: "OTP expired. Request new OTP." };
    }

    if (savedOTP === otp.trim()) {
      const found = users.find((u) => u.phone === phone);
      if (found && found.status === "active") {
        setUser(found);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
        localStorage.removeItem(`otp_${phone}`);
        localStorage.removeItem(`otp_time_${phone}`);
        return { success: true, user: found };
      } else if (found && found.status === "pending") {
        return { success: false, message: "Account pending approval" };
      }
    }
    return { success: false, message: "Invalid OTP" };
  };

  const signup = ({ name, email, password, company, phone, loginMethod }) => {
    const exists = users.find((u) => 
      (email && u.email === email) || (phone && u.phone === phone)
    );
    
    if (exists) {
      return { success: false, message: "Email or Phone already registered" };
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      password: password.trim(),
      loginMethod: loginMethod || "email",
      role: "user",
      company: company?.trim() || "",
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
      id: Date.now(),
      message: `🆕 New Signup: ${name} (${email || phone})`,
      time: new Date().toISOString(),
    };
    const updatedNotifies = [notifyMsg, ...(notifications || [])];

    setUsers(updatedUsers);
    setNotifications(updatedNotifies);
    saveAll(updatedUsers, updatedNotifies, user);

    return { success: true, message: "✅ Account created! Wait for admin approval." };
  };

  const createUser = ({ name, email, password, company, phone, loginMethod, role, status }) => {
    if (user?.role !== "admin" && user?.role !== "mis") {
      return { success: false, message: "Unauthorized" };
    }

    const exists = users.find((u) => 
      (email && u.email === email) || (phone && u.phone === phone)
    );
    
    if (exists) {
      return { success: false, message: "Email or Phone already exists" };
    }

    const defaultPermissions = role === "admin" || role === "mis" ? {
      dashboard: { view: true, create: true, edit: true, delete: true, export: true },
      reports: { view: true, create: true, edit: true, delete: true, export: true },
      hierarchy: { view: true, create: true, edit: true, delete: true, export: true },
      outstanding: { view: true, create: true, edit: true, delete: true, export: true },
      analyst: { view: true, create: true, edit: true, delete: true, export: true },
      messaging: { view: true, create: true, edit: true, delete: true, export: true },
      usermanagement: { view: true, create: true, edit: true, delete: true, export: true },
      setting: { view: true, create: true, edit: true, delete: true, export: true },
      helpsupport: { view: true, create: true, edit: true, delete: true, export: true },
    } : {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      reports: { view: true, create: false, edit: false, delete: false, export: true },
      hierarchy: { view: false, create: false, edit: false, delete: false, export: false },
      outstanding: { view: true, create: false, edit: false, delete: false, export: false },
      analyst: { view: false, create: false, edit: false, delete: false, export: false },
      messaging: { view: true, create: false, edit: false, delete: false, export: false },
      usermanagement: { view: false, create: false, edit: false, delete: false, export: false },
      setting: { view: false, create: false, edit: false, delete: false, export: false },
      helpsupport: { view: true, create: false, edit: false, delete: false, export: false },
    };

    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      password: password.trim(),
      loginMethod: loginMethod || "email",
      role: role || "user",
      company: company?.trim() || "",
      status: status || "active",
      permissions: defaultPermissions,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveAll(updatedUsers, notifications, user);

    return { success: true, message: "✅ User created successfully" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const approveUser = (id) => {
    const updated = users.map((u) => (u.id === id ? { ...u, status: "active" } : u));
    setUsers(updated);

    const approvedUser = updated.find((u) => u.id === id);
    const notifyMsg = {
      id: Date.now(),
      message: `✅ User Approved: ${approvedUser?.name}`,
      time: new Date().toISOString(),
    };

    const updatedNotifies = [notifyMsg, ...(notifications || [])];
    setNotifications(updatedNotifies);
    saveAll(updated, updatedNotifies, user);
  };

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

  const updateUserData = (userId, updates) => {
    if (user?.role !== "admin" && user?.role !== "mis") {
      return { success: false, message: "Unauthorized" };
    }

    const updated = users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
    setUsers(updated);
    saveAll(updated, notifications, user);

    if (userId === user.id) {
      const updatedCurrentUser = updated.find((u) => u.id === userId);
      setUser(updatedCurrentUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedCurrentUser));
    }

    return { success: true, message: "User updated" };
  };

  const deleteUser = (userId) => {
    if (user?.role !== "admin") {
      return { success: false, message: "Only admin can delete users" };
    }

    if (userId === user.id) {
      return { success: false, message: "Cannot delete your own account" };
    }

    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    saveAll(updated, notifications, user);

    return { success: true, message: "User deleted successfully" };
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
      }}
    >
      {initialized && children}
    </AuthContext.Provider>
  );
};
