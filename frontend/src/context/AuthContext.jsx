import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on start
  useEffect(() => {
    const saved = localStorage.getItem("sel_t_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  // LOG IN (Backend)
  const login = async (email, password, role) => {
    try {
      const res = await fetch(
        "https://selt-t-backend.selt-3232.workers.dev/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role })
        }
      );

      const data = await res.json();

      if (!data.success) return { success: false, message: data.message };

      // SAVE USER
      localStorage.setItem("sel_t_user", JSON.stringify(data.user));
      setUser(data.user);

      return { success: true };
    } catch (err) {
      return { success: false, message: "Server error" };
    }
  };

  // SIGNUP (Backend)
  const signup = async (form) => {
    try {
      const res = await fetch(
        "https://selt-t-backend.selt-3232.workers.dev/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        }
      );
      return await res.json();
    } catch (err) {
      return { success: false, message: "Server error" };
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("sel_t_user");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
