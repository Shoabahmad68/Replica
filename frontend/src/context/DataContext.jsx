// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email, password) => {
    // Static admin
    if (email === "admin@cw" && password === "admin@3232") {
      const adminUser = { id: "1", name: "Admin", role: "admin", email };
      setUser(adminUser);
      localStorage.setItem("auth_user", JSON.stringify(adminUser));
      return { success: true, role: "admin" };
    }
    // Dummy fallback users
    if (email && password) {
      const normalUser = { id: "2", name: email.split("@")[0], role: "user", email };
      setUser(normalUser);
      localStorage.setItem("auth_user", JSON.stringify(normalUser));
      return { success: true, role: "user" };
    }
    return { success: false, message: "Invalid credentials" };
  };

  const signup = (data) => {
    localStorage.setItem("pending_signup", JSON.stringify(data));
    return { success: true, message: "Signup submitted for approval" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  useEffect(() => {
    const stored = localStorage.getItem("auth_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
