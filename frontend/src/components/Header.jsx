// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Bell, Moon, Sun, Menu, User, LogOut, ChevronDown, Settings, BookOpen } from "lucide-react";
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

  // Event listeners for splash screen
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

  const toggleTheme = () => setDarkMode(!darkMode);

  // Close dropdowns on outside click
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
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 px-3 md:px-6 py-3 md:py-4">
        
        {/* LEFT: Mobile Menu + Logo (Mobile Only) */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => onNavigate && onNavigate("menu")}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"
          >
            <Menu size={20} />
          </button>
          <img
            src="/logo.png"
            alt="logo"
            className="h-10 w-10 rounded-full border border-[#64FFDA]/30"
          />
        </div>

        {/* CENTER: Title & Company Name */}
        <div className="flex-1 flex flex-col items-center justify-center text-center order-3 md:order-2 w-full md:w-auto mt-2 md:mt-0">
          <h1 className="text-base md:text-lg font-bold tracking-wide text-[#64FFDA]">
            Sel-T DATA ANALYST
          </h1>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
            Communication World Infomatic PVT. LTD.
          </p>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 md:gap-3 order-2 md:order-3">
          
          {/* Notification Bell - Only when logged in */}
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
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-2xl py-2 z-50 max-h-[70vh] overflow-auto">
                  <h4 className="text-[#64FFDA] text-sm font-semibold px-4 py-2 border-b border-[#1E2D45] sticky top-0 bg-[#0F1E33]">
                    🔔 Notifications
                  </h4>
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 text-sm text-gray-300 hover:bg-[#13253E] cursor-pointer border-b border-[#1E2D45]/50 transition"
                      >
                        <p className="font-medium">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(n.time).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-sm px-4 py-6 text-center">
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
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Auth Section */}
          {!user ? (
            // NOT LOGGED IN - Show Login/Signup Buttons
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="bg-white text-[#0A192F] px-3 md:px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-sm"
              >
                Login
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-[#64FFDA] text-[#0A192F] px-3 md:px-4 py-2 rounded-lg font-semibold hover:bg-[#52e6c3] transition text-xs md:text-sm"
              >
                Signup
              </button>
            </>
          ) : (
            // LOGGED IN - Show Profile Dropdown
            <div className="relative dropdown">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-2 md:px-3 py-2 rounded-lg transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden md:block max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown size={16} className="hidden md:block" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-2xl py-2 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-[#1E2D45] bg-gradient-to-r from-[#112240] to-[#0F1E33]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#64FFDA] truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="px-2 py-0.5 bg-[#64FFDA]/20 text-[#64FFDA] rounded-full">
                            {user.role}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate && onNavigate("setting");
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#13253E] hover:text-[#64FFDA] transition"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate && onNavigate("helpsupport");
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#13253E] hover:text-[#64FFDA] transition"
                    >
                      <BookOpen size={16} />
                      <span>Help & Support</span>
                    </button>
                  </div>

                  <hr className="border-[#1E2D45] my-1" />

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                      window.location.reload();
                    }}
                    className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                  >
                    <LogOut size={16} />
                    <span className="font-semibold">Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Login & Signup Popups */}
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupPopup onClose={() => setShowSignup(false)} />}
    </header>
  );
}
