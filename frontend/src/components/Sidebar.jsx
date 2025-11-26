import React, { useState } from "react";
import {
  Grid,
  FileText,
  Layers,
  DollarSign,
  Printer,
  MessageCircle,
  Users,
  Settings,
  BookOpen,
  Menu,
} from "lucide-react";

export default function Sidebar({ onNavigate }) {
  const [open, setOpen] = useState(false);

  const items = [
    { k: "dashboard", icon: <Grid size={16} />, label: "Dashboard" },
    { k: "reports", icon: <FileText size={16} />, label: "Reports" },
    { k: "hierarchy", icon: <Layers size={16} />, label: "Company Hierarchy" },
    { k: "outstanding", icon: <DollarSign size={16} />, label: "Outstanding" },
    { k: "analyst", icon: <Printer size={16} />, label: "Analyst" },
    { k: "messaging", icon: <MessageCircle size={16} />, label: "Messaging" },
    { k: "usermanagement", icon: <Users size={16} />, label: "User Management" }, // ✅ fixed
    { k: "setting", icon: <Settings size={16} />, label: "Settings" }, // ✅ fixed
    { k: "helpsupport", icon: <BookOpen size={16} />, label: "Help & Support" }, // ✅ fixed
  ];

  return (
    <>
      {/* 🔹 Mobile Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#64FFDA] text-[#0A192F] p-2 rounded-md shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} />
      </button>

      {/* 🔹 Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0A192F] text-white shadow-xl border-r border-[#112240] transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 z-40`}
      >
        <div className="flex flex-col items-center py-6 border-b border-[#112240]">
          <img
            src="/assets/logo.png"
            alt="Company Logo"
            className="w-36 h-16 object-contain mb-2 transition-transform duration-300 hover:scale-105"
          />
          <h1 className="text-lg font-bold text-[#64FFDA] tracking-wide">SEL-T MENU</h1>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[80vh]">
          {items.map((it) => (
            <button
              key={it.k}
              onClick={() => {
                onNavigate(it.k);
                setOpen(false);
              }}
              className="w-full text-left flex items-center gap-3 p-2 rounded-md font-medium hover:bg-[#112240] focus:bg-[#112240] hover:text-[#64FFDA] transition-all duration-200"
            >
              <span className="text-[#64FFDA]">{it.icon}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 🔹 Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
