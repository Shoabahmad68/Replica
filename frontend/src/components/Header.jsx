// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Bell, Moon, Sun, Menu, User, LogOut, ChevronDown, Settings, Shield } from "lucide-react";
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

  // Event listeners for splash screen buttons
  useEffect(() => {
    const handleOpenLogin = () => setShowLogin(true);
    const handleOpenSignup = () => setShowSignup(true);
    
    window.addEventListener('openLogin', handleOpenLogin);
    window.addEventListener('openSignup', handleOpenSignup);
    
    return () => {
      window.removeEventListener('openLogin', handleOpenLogin);
      window.removeEventListener('openSignup', handleOpenSignup);
    };
  }, []);

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
    <header className="fixed top-0 right-0 z-20 w-full bg-gradient-to-r from-[#0A192F] to-[#112240] text-white shadow-lg border-b border-[#1E2D45] md:left-64 left-0">
      <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
        
        {/* Left: Mobile Menu Button */}
        <button
          onClick={() => onNavigate && onNavigate("menu")}
          className="md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"
        >
          <Menu size={20} />
        </button>

        {/* Center: Title & Company (Always Visible) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-sm md:text-lg font-bold tracking-wide leading-tight text-[#64FFDA]">
            Sel-T DATA ANALYST
          </h1>
          <p className="text-[10px] md:text-xs opacity-80 text-gray-300 hidden sm:block">
            Communication World Infomatic PVT. LTD.
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Notification Bell */}
          {user && (
            <div className="relative dropdown">
              <button
                onClick={() => setShowNotify(!showNotify)}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition relative"
              >
                <Bell size={18} />
                {notifications?.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotify && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-xl py-2 z-50 max-h-80 overflow-auto">
                  <h4 className="text-[#64FFDA] text-sm px-3 mb-2 border-b border-[#1E2D45] pb-2 font-semibold">
                    🔔 Notifications
                  </h4>
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 text-sm text-gray-300 hover:bg-[#13253E] cursor-pointer border-b border-[#1E2D45]/50"
                      >
                        <p className="font-medium">{n.message}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(n.time).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-sm px-3 py-4 text-center">
                      No new notifications
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition hidden md:block"
          >
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Auth Buttons or User Menu */}
          {!user ? (
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="bg-white text-[#0A192F] px-3 md:px-4 py-2 rounded font-semibold hover:bg-gray-200 transition text-sm"
              >
                Login
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-[#64FFDA] text-[#0A192F] px-3 md:px-4 py-2 rounded font-semibold hover:bg-[#52e6c3] transition text-sm hidden sm:block"
              >
                Signup
              </button>
            </>
          ) : (
            <div className="relative dropdown">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-2 md:px-3 py-2 rounded-md transition"
              >
                <User size={16} />
                <span className="text-sm hidden md:block max-w-[100px] truncate">{user.name}</span>
                <ChevronDown size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-xl py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-[#1E2D45]">
                    <p className="font-semibold text-[#64FFDA] truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Shield size={12} />
                      {user.role}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      onNavigate && onNavigate("setting");
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#13253E] transition"
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      onNavigate && onNavigate("helpsupport");
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#13253E] transition"
                  >
                    <Bell size={16} />
                    Help & Support
                  </button>

                  <hr className="border-[#1E2D45] my-2" />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Popups */}
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupPopup onClose={() => setShowSignup(false)} />}
    </header>
  );
}
