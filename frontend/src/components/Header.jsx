// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Bell, Moon, Sun, Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LoginPopup from "./LoginPopup.jsx";
import SignupPopup from "./SignupPopup.jsx";

export default function Header({ onNavigate }) {
  const { user, logout, notifications } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Theme toggle
  const toggleTheme = () => setDarkMode(!darkMode);

  // Outside click close dropdowns
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".dropdown")) {
        setShowMenu(false);
        setShowNotify(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 z-20 flex flex-wrap md:flex-nowrap items-center justify-between p-4 shadow bg-gradient-to-r from-[#0A192F] to-[#112240] text-white transition-all duration-300 md:left-64 left-0"
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => onNavigate && onNavigate("menu")}
          className="md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg"
        >
          <Menu size={18} />
        </button>

        <img
          src="/logo.jpeg"
          alt="logo"
          className="h-12 w-12 md:h-14 md:w-14 rounded-full border-2 border-white flex-shrink-0"
        />

        <div className="flex flex-col">
          <div className="text-base md:text-lg font-bold tracking-wide leading-tight">
            MASTER ANALYSIS REPORTING SYSTEM
          </div>
          <div className="text-xs md:text-sm opacity-80">
            Communication World Infomatic PVT. LTD.
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-wrap items-center justify-end gap-2 mt-3 md:mt-0 relative">
        {/* Notification Bell */}
        <div className="relative dropdown">
          <button
            onClick={() => setShowNotify(!showNotify)}
            className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition relative"
          >
            <Bell size={18} />
            {notifications?.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full px-1">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotify && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-xl py-2 z-50 max-h-80 overflow-auto">
              <h4 className="text-[#64FFDA] text-sm px-3 mb-2 border-b border-[#1E2D45] pb-1">
                🔔 Notifications
              </h4>
              {notifications && notifications.length > 0 ? (
                notifications.map((n, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 text-sm text-gray-300 hover:bg-[#13253E] cursor-pointer"
                  >
                    {n.message}
                    <div className="text-xs text-gray-500">
                      {new Date(n.time).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm px-3 py-2">
                  No new notifications
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition"
        >
          {darkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Auth Buttons */}
        {!user ? (
          <>
            <button
              onClick={() => setShowLogin(true)}
              className="bg-white text-[#0A192F] px-3 py-2 rounded font-semibold hover:bg-gray-200 transition"
            >
              Login
            </button>
            <button
              onClick={() => setShowSignup(true)}
              className="bg-[#64FFDA] text-[#0A192F] px-3 py-2 rounded font-semibold hover:bg-[#52e6c3] transition"
            >
              Signup
            </button>
          </>
        ) : (
          <div className="relative dropdown">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md transition"
            >
              <User size={16} />
              <span className="text-sm">{user.name}</span>
              <ChevronDown size={16} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-xl py-2 z-50">
                <div className="px-4 py-2 text-sm text-gray-300 border-b border-[#1E2D45]">
                  <p>{user.email}</p>
                  <p className="text-xs text-gray-400">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full gap-2 px-4 py-2 text-red-400 hover:bg-[#13253E] transition"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupPopup onClose={() => setShowSignup(false)} />}
    </header>
  );
}
