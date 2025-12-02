// src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import {
  Settings, Shield, Bell, Palette, Cpu, Users, LineChart,
  Smartphone, ToggleLeft, Key, Building2, Database,
  Save, Trash2, Download, RefreshCw, CheckCircle, XCircle, Plus
} from "lucide-react";

export default function SettingsPage() {
  const [active, setActive] = useState("userRole");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- 1. GLOBAL STATE (Saari Settings Yahan Hain) ---
  const [config, setConfig] = useState({
    userRole: {
      allowSignup: true,
      requireConfirmation: true,
      defaultRole: "MIS",
      roles: ["Admin", "MIS", "Salesman", "User"],
      pendingUsers: [
        { id: 1, name: "shoaib", email: "shoaib@selt-t.com", status: "Pending" },
        { id: 2, name: "info", email: "info@selt-t.com", status: "Pending" }
      ]
    },
    features: {
      Analyst: { salesOrder: true, invoice: true, tallySync: true, whatsapp: true, gst: true, export: true },
      Outstanding: { partialPay: true, bulkReminder: false, graphs: true },
      Messaging: { whatsappInt: true, bulkSend: true, retry: true, templates: true },
      Dashboard: { summary: true, graphs: true, quickActions: false },
      Reports: { exportPdf: true, filters: true, dateRange: true }
    },
    theme: {
      mode: "Dark",
      font: "Inter",
      sidebar: "Left",
      logoUrl: ""
    },
    notifications: {
      channels: { email: true, whatsapp: true, inApp: true },
      triggers: { signup: true, payment: true, order: false, invoice: true, failedMsg: true }
    },
    security: {
      otpLogin: true,
      twoFactor: false,
      sessionTimeout: 30,
      ipWhitelist: "",
      passwordPolicy: "Strong"
    },
    hierarchy: {
      showDept: true,
      autoSync: false,
      allowManualEdit: false
    },
    reports: {
      visible: { sales: true, outstanding: true, recovery: true, activity: false },
      defaultFormat: "PDF"
    },
    integration: {
      tallyUrl: "http://localhost:9000",
      autoSync: true,
      whatsappKey: "********************",
      senderNumber: "919876543210"
    },
    advanced: {
      backupFreq: "Daily",
      retention: 90,
      autoSuspend: true,
      invoiceTemplate: "Professional"
    },
    mobile: {
      swipeActions: true,
      compactView: false,
      quickFilters: true
    }
  });

  // --- 2. LOAD & SAVE ---
  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("selt_full_config", JSON.stringify(config));
      setLoading(false);
      showToast("✅ All Settings Saved Successfully!");
    }, 1000);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to update state deeply
  const updateConfig = (section, key, value, subKey = null) => {
    setConfig(prev => {
      if (subKey) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: { ...prev[section][key], [subKey]: value }
          }
        };
      }
      return {
        ...prev,
        [section]: { ...prev[section], [key]: value }
      };
    });
  };

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
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-200 font-sans pb-24">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            <Settings className="animate-spin-slow" /> Master Control Panel
          </h2>
          {toast && (
            <div className="absolute top-6 right-6 bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg animate-fade-in z-50">
              {toast}
            </div>
          )}
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all border ${
                active === s.id
                  ? "bg-[#64FFDA] text-[#0A192F] border-[#64FFDA] shadow-[0_0_10px_rgba(100,255,218,0.3)]"
                  : "bg-[#112240] text-gray-400 border-[#223355] hover:bg-[#1a335f] hover:text-white"
              }`}
            >
              {s.icon}
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px] animate-fadeIn">
           {active === "userRole" && <UserRolePanel data={config.userRole} update={updateConfig} />}
           {active === "features" && <FeaturesPanel data={config.features} update={updateConfig} />}
           {active === "themeUI" && <ThemePanel data={config.theme} update={updateConfig} />}
           {active === "notifications" && <NotificationsPanel data={config.notifications} update={updateConfig} />}
           {active === "security" && <SecurityPanel data={config.security} update={updateConfig} />}
           {active === "hierarchy" && <HierarchyPanel data={config.hierarchy} update={updateConfig} />}
           {active === "reports" && <ReportsPanel data={config.reports} update={updateConfig} />}
           {active === "integration" && <IntegrationPanel data={config.integration} update={updateConfig} />}
           {active === "advanced" && <AdvancedPanel data={config.advanced} update={updateConfig} />}
           {active === "mobile" && <MobilePanel data={config.mobile} update={updateConfig} />}
        </div>

        {/* FLOATING SAVE BUTTON */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 bg-[#64FFDA] text-[#0A192F] px-8 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(100,255,218,0.4)] hover:shadow-[0_0_30px_rgba(100,255,218,0.6)] hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
            {loading ? "Saving System..." : "Save All Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* -------------------- 1. USER & ROLE PANEL -------------------- */
function UserRolePanel({ data, update }) {
  const [newRole, setNewRole] = useState("");

  const handleApprove = (id) => {
    const updated = data.pendingUsers.filter(u => u.id !== id);
    update("userRole", "pendingUsers", updated);
  };

  const handleAddRole = () => {
    if(newRole && !data.roles.includes(newRole)) {
      update("userRole", "roles", [...data.roles, newRole]);
      setNewRole("");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Settings */}
      <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] text-lg font-bold mb-4">Signup & Roles</h3>
        <div className="space-y-4">
          <Toggle label="Allow New Signups" checked={data.allowSignup} onChange={v => update("userRole", "allowSignup", v)} />
          <Toggle label="Require Email/WhatsApp Confirmation" checked={data.requireConfirmation} onChange={v => update("userRole", "requireConfirmation", v)} />
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Default Role</label>
            <select 
              value={data.defaultRole} 
              onChange={e => update("userRole", "defaultRole", e.target.value)}
              className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white"
            >
              {data.roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-gray-400 text-sm mb-1">Create New Role</label>
             <div className="flex gap-2">
               <input 
                  type="text" 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white" 
                  placeholder="e.g. Manager"
                />
               <button onClick={handleAddRole} className="bg-[#64FFDA] text-[#0A192F] p-2 rounded"><Plus /></button>
             </div>
             <div className="flex flex-wrap gap-2 mt-2">
                {data.roles.map(r => <span key={r} className="px-2 py-1 bg-[#112240] text-xs rounded border border-[#223355]">{r}</span>)}
             </div>
          </div>
        </div>
      </div>

      {/* Pending List */}
      <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] text-lg font-bold mb-4">Pending Approvals</h3>
        {data.pendingUsers.length === 0 ? <p className="text-gray-500">No pending users.</p> : (
          <div className="space-y-3">
            {data.pendingUsers.map(user => (
              <div key={user.id} className="flex justify-between items-center bg-[#112240] p-3 rounded border border-[#223355]">
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-gray-400 text-xs">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(user.id)} className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500 hover:text-white"><CheckCircle size={16}/></button>
                  <button onClick={() => handleApprove(user.id)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white"><XCircle size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- 2. FEATURE TOGGLES -------------------- */
function FeaturesPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(data).map(([moduleName, features]) => (
        <div key={moduleName} className="bg-[#081A33] p-4 rounded-xl border border-[#1E2D50]">
          <h4 className="text-[#64FFDA] font-bold mb-3 border-b border-[#1E2D50] pb-2">{moduleName} Module</h4>
          <div className="space-y-2">
            {Object.entries(features).map(([key, val]) => (
              <Toggle 
                key={key} 
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                checked={val} 
                onChange={v => update("features", moduleName, v, key)} // Nested update
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- 3. THEME PANEL -------------------- */
function ThemePanel({ data, update }) {
  return (
    <div className="bg-[#0D1B34] p-6 rounded-xl border border-[#1E2D50] grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Color Scheme</label>
          <select value={data.mode} onChange={e => update("theme", "mode", e.target.value)} className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white">
            <option>Dark</option>
            <option>Light</option>
            <option>High Contrast</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Font Family</label>
          <select value={data.font} onChange={e => update("theme", "font", e.target.value)} className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white">
            <option>Inter</option>
            <option>Roboto</option>
            <option>Poppins</option>
            <option>Open Sans</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
         <div>
          <label className="block text-gray-400 text-sm mb-1">Sidebar Position</label>
          <div className="flex gap-4">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="radio" checked={data.sidebar === "Left"} onChange={() => update("theme", "sidebar", "Left")} className="accent-[#64FFDA]"/> Left
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="radio" checked={data.sidebar === "Right"} onChange={() => update("theme", "sidebar", "Right")} className="accent-[#64FFDA]"/> Right
             </label>
          </div>
        </div>
        <div>
           <label className="block text-gray-400 text-sm mb-1">Upload Logo URL</label>
           <input 
              type="text" 
              value={data.logoUrl} 
              onChange={e => update("theme", "logoUrl", e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white" 
            />
        </div>
      </div>
    </div>
  );
}

/* -------------------- 4. NOTIFICATIONS -------------------- */
function NotificationsPanel({ data, update }) {
  return (
    <div className="bg-[#0D1B34] p-6 rounded-xl border border-[#1E2D50] space-y-6">
      <div>
        <h3 className="text-[#64FFDA] font-bold mb-3">Delivery Channels</h3>
        <div className="flex flex-wrap gap-6">
          <Toggle label="Email Alerts" checked={data.channels.email} onChange={v => update("notifications", "channels", v, "email")} />
          <Toggle label="WhatsApp Alerts" checked={data.channels.whatsapp} onChange={v => update("notifications", "channels", v, "whatsapp")} />
          <Toggle label="In-App Toasts" checked={data.channels.inApp} onChange={v => update("notifications", "channels", v, "inApp")} />
        </div>
      </div>
      <div className="border-t border-[#1E2D50] pt-4">
        <h3 className="text-[#64FFDA] font-bold mb-3">Event Triggers</h3>
        <div className="grid md:grid-cols-2 gap-4">
           {Object.entries(data.triggers).map(([key, val]) => (
              <Toggle key={key} label={`On ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={val} onChange={v => update("notifications", "triggers", v, key)} />
           ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- 5. SECURITY -------------------- */
function SecurityPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50] space-y-4">
          <h3 className="text-[#64FFDA] font-bold">Authentication</h3>
          <Toggle label="OTP Login via WhatsApp" checked={data.otpLogin} onChange={v => update("security", "otpLogin", v)} />
          <Toggle label="Two-Factor Authentication (2FA)" checked={data.twoFactor} onChange={v => update("security", "twoFactor", v)} />
          <div>
            <label className="text-gray-400 text-sm">Session Timeout (Minutes)</label>
            <input type="number" value={data.sessionTimeout} onChange={e => update("security", "sessionTimeout", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white" />
          </div>
       </div>
       <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50] space-y-4">
          <h3 className="text-[#64FFDA] font-bold">Network Security</h3>
          <label className="text-gray-400 text-sm block">Whitelist IPs (Comma separated)</label>
          <textarea 
            value={data.ipWhitelist} 
            onChange={e => update("security", "ipWhitelist", e.target.value)}
            className="w-full h-24 bg-[#112240] p-2 rounded border border-[#223355] text-white text-sm"
            placeholder="192.168.1.1, 127.0.0.1"
          />
       </div>
    </div>
  );
}

/* -------------------- 6. HIERARCHY -------------------- */
function HierarchyPanel({ data, update }) {
  return (
    <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50] text-center py-10">
       <Building2 size={48} className="text-[#64FFDA] mx-auto mb-4 opacity-80" />
       <h3 className="text-[#64FFDA] font-bold mb-4">Structure Configuration</h3>
       <div className="max-w-md mx-auto space-y-4 text-left">
          <Toggle label="Show Departments in Tree" checked={data.showDept} onChange={v => update("hierarchy", "showDept", v)} />
          <Toggle label="Auto-Sync Hierarchy from Tally" checked={data.autoSync} onChange={v => update("hierarchy", "autoSync", v)} />
          <Toggle label="Allow Manual Override" checked={data.allowManualEdit} onChange={v => update("hierarchy", "allowManualEdit", v)} />
       </div>
    </div>
  );
}

/* -------------------- 7. REPORTS -------------------- */
function ReportsPanel({ data, update }) {
  return (
    <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50]">
       <h3 className="text-[#64FFDA] font-bold mb-4">Report Visibility & Defaults</h3>
       <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
             <h4 className="text-gray-400 text-sm">Visible Reports</h4>
             {Object.entries(data.visible).map(([key, val]) => (
                <Toggle key={key} label={`Show ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={val} onChange={v => update("reports", "visible", v, key)} />
             ))}
          </div>
          <div>
             <h4 className="text-gray-400 text-sm mb-2">Default Export Format</h4>
             <select value={data.defaultFormat} onChange={e => update("reports", "defaultFormat", e.target.value)} className="w-full bg-[#112240] p-2 rounded border border-[#223355] text-white">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
             </select>
          </div>
       </div>
    </div>
  );
}

/* -------------------- 8. INTEGRATION -------------------- */
function IntegrationPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className="bg-[#081A33] p-5 rounded-xl border border-[#1E2D50]">
          <h4 className="text-[#64FFDA] font-bold mb-4 flex items-center gap-2"><Cpu size={18}/> Tally Prime Sync</h4>
          <div className="space-y-4">
             <div>
                <label className="text-gray-400 text-sm">Tally Connector URL</label>
                <input type="text" value={data.tallyUrl} onChange={e => update("integration", "tallyUrl", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white" />
             </div>
             <Toggle label="Auto Sync Every 1 Hour" checked={data.autoSync} onChange={v => update("integration", "autoSync", v)} />
             <button className="w-full bg-blue-600/20 text-blue-400 border border-blue-600/50 p-2 rounded hover:bg-blue-600 hover:text-white transition">Test Tally Connection</button>
          </div>
       </div>
       <div className="bg-[#081A33] p-5 rounded-xl border border-[#1E2D50]">
          <h4 className="text-[#64FFDA] font-bold mb-4 flex items-center gap-2"><Smartphone size={18}/> WhatsApp API</h4>
          <div className="space-y-4">
             <div>
                <label className="text-gray-400 text-sm">API Key</label>
                <input type="password" value={data.whatsappKey} onChange={e => update("integration", "whatsappKey", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white" />
             </div>
             <div>
                <label className="text-gray-400 text-sm">Sender Number</label>
                <input type="text" value={data.senderNumber} onChange={e => update("integration", "senderNumber", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white" />
             </div>
          </div>
       </div>
    </div>
  );
}

/* -------------------- 9. ADVANCED -------------------- */
function AdvancedPanel({ data, update }) {
  return (
    <div className="space-y-4">
       <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50] flex flex-wrap gap-4 justify-between items-center">
          <div className="space-y-4 w-full md:w-auto">
             <div>
                <label className="text-gray-400 text-sm">Data Backup Frequency</label>
                <select value={data.backupFreq} onChange={e => update("advanced", "backupFreq", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white">
                   <option>Hourly</option>
                   <option>Daily</option>
                   <option>Weekly</option>
                </select>
             </div>
             <div>
                <label className="text-gray-400 text-sm">Log Retention (Days)</label>
                <input type="number" value={data.retention} onChange={e => update("advanced", "retention", e.target.value)} className="w-full bg-[#112240] mt-1 p-2 rounded border border-[#223355] text-white" />
             </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
             <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/> Clear Cache</button>
             <button className="flex items-center gap-2 px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/50 text-[#64FFDA] rounded hover:bg-[#64FFDA] hover:text-black transition"><Download size={16}/> Export Config JSON</button>
          </div>
       </div>
    </div>
  );
}

/* -------------------- 10. MOBILE -------------------- */
function MobilePanel({ data, update }) {
  return (
    <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50] space-y-4">
       <h3 className="text-[#64FFDA] font-bold">App Behavior on Mobile</h3>
       <Toggle label="Enable Swipe Actions (Lists)" checked={data.swipeActions} onChange={v => update("mobile", "swipeActions", v)} />
       <Toggle label="Force Compact View" checked={data.compactView} onChange={v => update("mobile", "compactView", v)} />
       <Toggle label="Show Quick Filters Bar" checked={data.quickFilters} onChange={v => update("mobile", "quickFilters", v)} />
    </div>
  );
}

/* --- REUSABLE TOGGLE --- */
const Toggle = ({ label, checked, onChange }) => (
  <div className="flex justify-between items-center py-2 border-b border-[#122240] last:border-0">
    <span className="text-sm text-gray-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked || false} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#64FFDA]"></div>
    </label>
  </div>
);
