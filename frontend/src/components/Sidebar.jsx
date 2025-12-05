// src/components/Sidebar.jsx
import React, { useState } from "react";
import {
  Grid, FileText, Layers, DollarSign, Printer, MessageCircle,
  Users, Settings, BookOpen, Menu, Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNavigate }) {
  const { user, canView } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allItems = [
    { k: "dashboard", icon: <Grid size={16} />, label: "Dashboard" },
    { k: "reports", icon: <FileText size={16} />, label: "Reports" },
    { k: "hierarchy", icon: <Layers size={16} />, label: "Company Hierarchy" },
    { k: "outstanding", icon: <DollarSign size={16} />, label: "Outstanding" },
    { k: "analyst", icon: <Printer size={16} />, label: "Analyst" },
    { k: "messaging", icon: <MessageCircle size={16} />, label: "Messaging" },
    { k: "usermanagement", icon: <Users size={16} />, label: "User Management" },
    { k: "setting", icon: <Settings size={16} />, label: "Settings" },
    { k: "helpsupport", icon: <BookOpen size={16} />, label: "Help & Support" },
  ];

  // 🔥 FIX: canAccess → canView
  const allowedItems = allItems.filter((item) => canView(item.k));

  const filteredItems = allowedItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#64FFDA] text-[#0A192F] p-2 rounded-md shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#0A192F] 
        to-[#112240] text-white shadow-xl border-r border-[#1E2D45] transform 
        transition-transform duration-300 ease-in-out 
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 z-40`}
      >
        <div className="flex flex-col items-center py-6 border-b border-[#1E2D45]">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-20 h-20 object-contain mb-3 rounded-full border-2 border-[#64FFDA]/30"
          />
          <h1 className="text-xl font-bold text-[#64FFDA]">SEL-T</h1>
          <p className="text-xs text-gray-400 mt-1">Business Intelligence</p>
          <span className="mt-2 px-3 py-1 bg-[#64FFDA]/20 text-[#64FFDA] rounded-full text-xs font-semibold">
            {user.role.toUpperCase()}
          </span>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[#64FFDA]/60" size={16} />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-2 rounded-lg 
              text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 
              focus:ring-[#64FFDA] transition"
            />
          </div>
        </div>

        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
          {filteredItems.length > 0 ? (
            filteredItems.map((it) => (
              <button
                key={it.k}
                onClick={() => {
                  onNavigate(it.k);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg 
                font-medium hover:bg-[#112240] hover:text-[#64FFDA] transition-all duration-200 group"
              >
                <span className="text-[#64FFDA] group-hover:scale-110 transition-transform">
                  {it.icon}
                </span>
                <span className="text-sm">{it.label}</span>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">No access</p>
          )}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0A192F; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #64FFDA; border-radius: 3px; }
      `}</style>
    </>
  );
}
