// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Bell, Moon, User, LogOut, ChevronDown, Settings, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LoginPopup from "./LoginPopup.jsx";
import SignupPopup from "./SignupPopup.jsx";

export default function Header({ onNavigate }) {
  const { user, logout, notifications } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotify, setShowNotify] = useState(false);

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
    <>
      <header className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-r from-[#0A192F] to-[#112240] text-white shadow-lg border-b border-[#1E2D45]">
        <div className="flex items-center justify-between px-4 py-3 max-w-[100vw]">
          
          {/* CENTER: Title (Always visible & centered) */}
          <div className="flex-1 text-center">
            <h1 className="text-sm md:text-lg font-bold text-[#64FFDA] leading-tight">
              Sel-T DATA ANALYST
            </h1>
            <p className="text-[9px] md:text-xs text-gray-400 hidden sm:block">
              Communication World Infomatic PVT. LTD.
            </p>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            
            {/* Notification - Only when logged in */}
            {user && (
              <div className="relative dropdown">
                <button
                  onClick={() => setShowNotify(!showNotify)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition relative"
                >
                  <Bell size={18} />
                  {notifications?.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotify && (
                  <div className="absolute right-0 mt-2 w-[85vw] max-w-[320px] bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-2xl py-2 max-h-[60vh] overflow-auto">
                    <h4 className="text-[#64FFDA] text-sm font-semibold px-3 py-2 border-b border-[#1E2D45] sticky top-0 bg-[#0F1E33]">
                      🔔 Notifications
                    </h4>
                    {notifications && notifications.length > 0 ? (
                      notifications.map((n, i) => (
                        <div key={i} className="px-3 py-2 text-sm text-gray-300 hover:bg-[#13253E] border-b border-[#1E2D45]/50">
                          <p className="font-medium text-xs">{n.message}</p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(n.time).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-xs px-3 py-4 text-center">No notifications</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Auth Section */}
            {!user ? (
              <>
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-white text-[#0A192F] px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200 transition text-xs"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-[#64FFDA] text-[#0A192F] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#52e6c3] transition text-xs"
                >
                  Signup
                </button>
              </>
            ) : (
              <div className="relative dropdown">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg transition"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0F1E33] border border-[#1E2D45] rounded-lg shadow-2xl py-2">
                    <div className="px-3 py-2 border-b border-[#1E2D45] bg-gradient-to-r from-[#112240] to-[#0F1E33]">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#64FFDA] text-sm truncate">{user.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                          <span className="inline-block px-2 py-0.5 bg-[#64FFDA]/20 text-[#64FFDA] rounded-full text-[9px] mt-1">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate && onNavigate("setting");
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#13253E] hover:text-[#64FFDA] transition"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate && onNavigate("helpsupport");
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#13253E] hover:text-[#64FFDA] transition"
                    >
                      <BookOpen size={16} />
                      <span>Help & Support</span>
                    </button>

                    <hr className="border-[#1E2D45] my-1" />

                    <button
                      onClick={() => {
                        logout();
                        setShowMenu(false);
                        window.location.reload();
                      }}
                      className="flex items-center w-full gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
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
      </header>

      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupPopup onClose={() => setShowSignup(false)} />}
    </>
  );
}
