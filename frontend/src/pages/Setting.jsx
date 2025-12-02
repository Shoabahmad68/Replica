// src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import { 
  User, 
  Settings as SettingsIcon, 
  Database, 
  Shield, 
  Save, 
  Trash2, 
  Download, 
  LogOut,
  Bell,
  Monitor
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // --- STATE MANAGEMENT (Real Working State) ---
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@sel-t.com",
    role: "Administrator",
    company: "Communication World Infomatic"
  });

  const [preferences, setPreferences] = useState({
    darkMode: true,
    notifications: true,
    compactView: false,
    currency: "INR"
  });

  // --- 1. LOAD SAVED SETTINGS ON MOUNT ---
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    const savedPref = localStorage.getItem("userPreferences");

    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedPref) setPreferences(JSON.parse(savedPref));
  }, []);

  // --- 2. SAVE FUNCTIONS ---
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate Network Request
    setTimeout(() => {
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setLoading(false);
      showToast("✅ Profile Updated Successfully!");
    }, 800);
  };

  const handleSavePreferences = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("userPreferences", JSON.stringify(preferences));
      setLoading(false);
      showToast("✅ Preferences Saved!");
      
      // Real-time effect logic (Example)
      if (preferences.compactView) {
        document.body.classList.add('compact-mode');
      } else {
        document.body.classList.remove('compact-mode');
      }
    }, 500);
  };

  // --- 3. DATA MANAGEMENT FUNCTIONS ---
  const clearAppCache = () => {
    if (window.confirm("Are you sure? This will clear all loaded reports and logout.")) {
      localStorage.clear();
      showToast("🧹 Cache Cleared! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, preferences }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "selt_config_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("⬇️ Configuration Exported!");
  };

  // Helper for Toasts
  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // --- UI COMPONENTS ---
  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full p-4 rounded-xl transition-all duration-200 text-left mb-2 
        ${activeTab === id 
          ? "bg-[#00f5ff] text-black font-bold shadow-[0_0_15px_rgba(0,245,255,0.4)]" 
          : "text-gray-400 hover:bg-[#112240] hover:text-white"
        }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00f5ff]">Settings & Configuration</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account and dashboard preferences</p>
        </div>
        {message && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg animate-fade-in-down">
            {message}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-[#112240] p-4 rounded-2xl border border-[#1e3553] shadow-lg">
            <TabButton id="profile" label="Profile" icon={User} />
            <TabButton id="preferences" label="Preferences" icon={SettingsIcon} />
            <TabButton id="data" label="Data & Storage" icon={Database} />
            <TabButton id="security" label="Security" icon={Shield} />
          </div>

          <div className="mt-6 bg-[#112240] p-4 rounded-2xl border border-[#1e3553] text-center">
             <p className="text-xs text-gray-500 mb-2">Sel-T Dashboard v2.0</p>
             <button className="text-red-400 text-xs flex items-center justify-center gap-2 hover:text-red-300 w-full">
                <LogOut size={12} /> Log Out
             </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 bg-[#112240] rounded-2xl border border-[#1e3553] shadow-lg p-6 md:p-8">
          
          {/* --- PROFILE TAB --- */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-[#1e3553] pb-2">User Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-xs mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full bg-[#0a1628] border border-[#1e3553] rounded-lg p-3 text-white focus:border-[#00f5ff] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full bg-[#0a1628] border border-[#1e3553] rounded-lg p-3 text-white focus:border-[#00f5ff] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-2">Role (Read Only)</label>
                  <input 
                    type="text" 
                    value={profile.role} 
                    disabled
                    className="w-full bg-[#0a1628]/50 border border-[#1e3553] rounded-lg p-3 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-2">Company Name</label>
                  <input 
                    type="text" 
                    value={profile.company}
                    onChange={(e) => setProfile({...profile, company: e.target.value})}
                    className="w-full bg-[#0a1628] border border-[#1e3553] rounded-lg p-3 text-white focus:border-[#00f5ff] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00f5ff] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00dce6] transition disabled:opacity-50">
                  {loading ? "Saving..." : <><Save size={16} /> Save Changes</>}
                </button>
              </div>
            </form>
          )}

          {/* --- PREFERENCES TAB --- */}
          {activeTab === "preferences" && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-[#1e3553] pb-2">System Preferences</h2>

              {/* Toggle Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-[#0a1628] rounded-xl border border-[#1e3553]">
                  <div className="flex items-center gap-3">
                    <Monitor className="text-[#00f5ff]" />
                    <div>
                      <p className="font-medium text-white">Dark Mode</p>
                      <p className="text-xs text-gray-400">Use system default or force dark theme</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={preferences.darkMode} onChange={() => setPreferences({...preferences, darkMode: !preferences.darkMode})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f5ff]"></div>
                  </label>
                </div>

                <div className="flex justify-between items-center p-4 bg-[#0a1628] rounded-xl border border-[#1e3553]">
                  <div className="flex items-center gap-3">
                    <Bell className="text-[#00f5ff]" />
                    <div>
                      <p className="font-medium text-white">Notifications</p>
                      <p className="text-xs text-gray-400">Enable email and push alerts</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={preferences.notifications} onChange={() => setPreferences({...preferences, notifications: !preferences.notifications})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f5ff]"></div>
                  </label>
                </div>
                
                 <div className="flex justify-between items-center p-4 bg-[#0a1628] rounded-xl border border-[#1e3553]">
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="text-[#00f5ff]" />
                    <div>
                      <p className="font-medium text-white">Compact View</p>
                      <p className="text-xs text-gray-400">Decrease whitespace in tables</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={preferences.compactView} onChange={() => setPreferences({...preferences, compactView: !preferences.compactView})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f5ff]"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={handleSavePreferences} disabled={loading} className="flex items-center gap-2 bg-[#00f5ff] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00dce6] transition disabled:opacity-50">
                  {loading ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </div>
          )}

          {/* --- DATA TAB --- */}
          {activeTab === "data" && (
             <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-[#1e3553] pb-2">Data Management</h2>
              
              <div className="bg-[#0a1628] p-5 rounded-xl border border-[#1e3553] flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h3 className="text-white font-bold flex items-center gap-2"><Trash2 size={18} className="text-red-500"/> Clear Application Cache</h3>
                    <p className="text-gray-400 text-xs mt-1">Fixes issues with data not loading or old data showing up. Requires reload.</p>
                 </div>
                 <button onClick={clearAppCache} className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition font-bold text-sm">
                    Clear Cache Now
                 </button>
              </div>

               <div className="bg-[#0a1628] p-5 rounded-xl border border-[#1e3553] flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h3 className="text-white font-bold flex items-center gap-2"><Download size={18} className="text-green-500"/> Export Configuration</h3>
                    <p className="text-gray-400 text-xs mt-1">Download a backup of your local settings.</p>
                 </div>
                 <button onClick={exportConfig} className="px-4 py-2 bg-green-500/10 border border-green-500/50 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition font-bold text-sm">
                    Export JSON
                 </button>
              </div>
             </div>
          )}

           {/* --- SECURITY TAB --- */}
           {activeTab === "security" && (
             <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-[#1e3553] pb-2">Security Settings</h2>
               
               <div className="bg-[#0a1628] p-6 rounded-xl border border-[#1e3553]">
                  <h3 className="text-white font-bold mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <input type="password" placeholder="Current Password" className="w-full bg-[#112240] border border-[#1e3553] rounded p-3 text-white text-sm" />
                    <input type="password" placeholder="New Password" className="w-full bg-[#112240] border border-[#1e3553] rounded p-3 text-white text-sm" />
                    <input type="password" placeholder="Confirm New Password" className="w-full bg-[#112240] border border-[#1e3553] rounded p-3 text-white text-sm" />
                  </div>
                  <div className="mt-4 flex justify-end">
                     <button className="bg-[#00f5ff] text-black px-4 py-2 rounded font-bold text-sm hover:bg-[#00dce6]">Update Password</button>
                  </div>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
