// ✅ frontend/src/pages/Settings.jsx
import React, { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Cpu,
  Users,
  LineChart,
  Smartphone,
  ToggleLeft,
  Key,
  Building2,
  FileSpreadsheet,
  Database,
} from "lucide-react";

export default function SettingsPage() {
  const [active, setActive] = useState("userRole");

  const sections = [
    { id: "userRole", label: "User & Role Management", icon: <Users size={18} /> },
    { id: "features", label: "Module Feature Toggles", icon: <ToggleLeft size={18} /> },
    { id: "themeUI", label: "Theme & UI Settings", icon: <Palette size={18} /> },
    { id: "notifications", label: "Notification Settings", icon: <Bell size={18} /> },
    { id: "security", label: "Login & Security", icon: <Shield size={18} /> },
    { id: "hierarchy", label: "Company Hierarchy", icon: <Building2 size={18} /> },
    { id: "reports", label: "Report Visibility & Export", icon: <LineChart size={18} /> },
    { id: "integration", label: "Integration Settings", icon: <Cpu size={18} /> },
    { id: "advanced", label: "Advanced Settings", icon: <Database size={18} /> },
    { id: "mobile", label: "Mobile Optimization", icon: <Smartphone size={18} /> },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-200">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            <Settings /> System Settings Panel
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-all ${
                active === s.id
                  ? "bg-[#64FFDA] text-[#0A192F]"
                  : "bg-[#112240] text-gray-300 border border-[#223355]"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {active === "userRole" && <UserRoleManagement />}
          {active === "features" && <FeatureToggles />}
          {active === "themeUI" && <ThemeUI />}
          {active === "notifications" && <NotificationPanel />}
          {active === "security" && <SecurityPanel />}
          {active === "hierarchy" && <HierarchyPanel />}
          {active === "reports" && <ReportsPanel />}
          {active === "integration" && <IntegrationPanel />}
          {active === "advanced" && <AdvancedPanel />}
          {active === "mobile" && <MobilePanel />}
        </div>
      </div>
    </div>
  );
}

/* 🧩 1. User & Role Management */
function UserRoleManagement() {
  return (
    <div className="bg-[#0D1B34] p-5 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] text-lg font-semibold mb-2">User & Role Management</h3>
      <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
        <li>Pending Signups List — Approve / Reject / Assign Role</li>
        <li>WhatsApp/Email Confirmation Toggle</li>
        <li>Create, Edit, Delete Roles (RBAC)</li>
        <li>Assign per-module access (Dashboard, Reports, Analyst, Messaging, etc.)</li>
        <li>Permission toggles: View / Create / Edit / Delete / Export</li>
      </ul>
    </div>
  );
}

/* 🧩 2. Feature Toggles */
function FeatureToggles() {
  const modules = {
    Analyst: [
      "Sales Order Entry",
      "Invoice Generation",
      "Buzz Reports",
      "Tally Sync",
      "WhatsApp Send",
      "GST/Discount/Payment Modes",
      "Export Options",
    ],
    Outstanding: ["Partial Payment", "Bulk Reminder", "Graphs & Trends"],
    Messaging: ["WhatsApp Integration", "Bulk Send", "Retry Failed", "Template Builder"],
    Dashboard: ["Summary Cards", "Graphs", "Quick Actions"],
    Reports: ["Export PDF/Excel", "Filters", "Date Range Control"],
  };
  return (
    <div className="space-y-4">
      {Object.entries(modules).map(([mod, feats]) => (
        <div
          key={mod}
          className="bg-[#081A33] p-4 rounded border border-[#1E2D50] shadow-md"
        >
          <h4 className="text-[#64FFDA] mb-2 font-semibold">{mod} Module</h4>
          {feats.map((f, i) => (
            <div key={i} className="flex justify-between border-b border-[#122240] py-1 text-sm">
              <span>{f}</span>
              <input type="checkbox" defaultChecked className="accent-[#64FFDA]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* 🧩 3. Theme & UI */
function ThemeUI() {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50] grid sm:grid-cols-2 gap-4 text-sm">
      <div>
        <label>Color Scheme</label>
        <select className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355]">
          <option>Dark</option>
          <option>Light</option>
          <option>Custom</option>
        </select>
      </div>
      <div>
        <label>Font Style</label>
        <select className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355]">
          <option>Inter</option>
          <option>Roboto</option>
          <option>Poppins</option>
        </select>
      </div>
      <div>
        <label>Sidebar Position</label>
        <select className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355]">
          <option>Left</option>
          <option>Right</option>
          <option>Floating</option>
        </select>
      </div>
      <div>
        <label>Upload Logo</label>
        <input type="file" className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355]" />
      </div>
    </div>
  );
}

/* 🧩 4. Notifications */
function NotificationPanel() {
  const triggers = [
    "New Signup",
    "Payment Received",
    "Sales Order Created",
    "Invoice Due",
    "Message Failed",
  ];
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50] text-sm space-y-3">
      <h3 className="text-[#64FFDA] mb-2">Notification Settings</h3>
      <div className="flex gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Email
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> WhatsApp
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> In-App
        </label>
      </div>
      <div className="mt-3">
        {triggers.map((t, i) => (
          <div key={i} className="flex justify-between border-b border-[#122240] py-1">
            <span>{t}</span>
            <input type="checkbox" defaultChecked className="accent-[#64FFDA]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 🧩 5. Security */
function SecurityPanel() {
  return (
    <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] text-sm">
      <h3 className="text-[#64FFDA] mb-2">Login & Security</h3>
      <ul className="list-disc ml-5 text-gray-300 space-y-1">
        <li>Login via Email+Password or OTP via WhatsApp</li>
        <li>Password Policy, 2FA, Session Timeout</li>
        <li>Signup toggle, IP Whitelist control</li>
      </ul>
    </div>
  );
}

/* 🧩 6. Hierarchy */
function HierarchyPanel() {
  return (
    <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2">Company Hierarchy</h3>
      <p className="text-sm text-gray-300">
        Manage departments, assign users, and set reporting structures.
      </p>
    </div>
  );
}

/* 🧩 7. Reports */
function ReportsPanel() {
  const items = ["Sales Summary", "Outstanding Summary", "Recovery Graph", "User Activity"];
  return (
    <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] space-y-2 text-sm">
      <h3 className="text-[#64FFDA] mb-2">Report Visibility</h3>
      {items.map((i) => (
        <div key={i} className="flex justify-between border-b border-[#122240] py-1">
          <span>{i}</span>
          <input type="checkbox" defaultChecked className="accent-[#64FFDA]" />
        </div>
      ))}
    </div>
  );
}

/* 🧩 8. Integrations */
function IntegrationPanel() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] text-sm">
        <h4 className="text-[#64FFDA] mb-2">Tally Sync</h4>
        <ul className="list-disc ml-5 text-gray-300 space-y-1">
          <li>Company Selection</li>
          <li>Auto / Manual Sync</li>
          <li>Connector Status</li>
        </ul>
      </div>
      <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] text-sm">
        <h4 className="text-[#64FFDA] mb-2">WhatsApp Integration</h4>
        <ul className="list-disc ml-5 text-gray-300 space-y-1">
          <li>QR Login</li>
          <li>Default Sender Setup</li>
          <li>Rate Limit Control</li>
        </ul>
      </div>
    </div>
  );
}

/* 🧩 9. Advanced */
function AdvancedPanel() {
  return (
    <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] text-sm text-gray-300 space-y-1">
      <h3 className="text-[#64FFDA] mb-2">Advanced Settings</h3>
      <ul className="list-disc ml-5 space-y-1">
        <li>Backup Schedule & Retention Policy</li>
        <li>Auto Suspend Inactive Users</li>
        <li>Audit Log Retention Period</li>
        <li>Invoice Template Selection</li>
      </ul>
    </div>
  );
}

/* 🧩 10. Mobile */
function MobilePanel() {
  return (
    <div className="bg-[#081A33] p-4 rounded border border-[#1E2D50] text-sm text-gray-300 space-y-1">
      <h3 className="text-[#64FFDA] mb-2">Mobile Optimization</h3>
      <ul className="list-disc ml-5 space-y-1">
        <li>Enable Swipe Actions</li>
        <li>Compact View</li>
        <li>Quick Filters</li>
      </ul>
    </div>
  );
}
