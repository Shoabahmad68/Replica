// src/components/SignupPopup.jsx
import React, { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, Building, X } from "lucide-react";

export default function SignupPopup({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirm: "",
    loginMethod: "email",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://selt-t-backend.selt-3232.workers.dev";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.password !== form.confirm) {
      setMsg("❌ Passwords do not match!");
      return;
    }
    if (form.password.length < 6) {
      setMsg("❌ Password must be at least 6 characters");
      return;
    }
    if (form.loginMethod === "email" && !form.email) {
      setMsg("❌ Email required");
      return;
    }
    if (form.loginMethod === "phone" && !form.phone) {
      setMsg("❌ Phone required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      setMsg(data.message);

      if (data.success) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      setLoading(false);
      setMsg("❌ Network error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn overflow-y-auto p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-2xl shadow-[0_0_50px_rgba(100,255,218,0.2)] animate-scaleIn my-8">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <UserPlus className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#64FFDA]">Create Account</h2>
          <p className="text-gray-400 text-xs md:text-sm mt-1">Join Sel-T Business Intelligence</p>
        </div>

        {/* Login Method */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "email" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              form.loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" /> Email Login
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "phone" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              form.loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" /> Phone Login
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          {form.loginMethod === "email" && (
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          )}

          {/* Phone */}
          {form.loginMethod === "phone" && (
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
          )}

          {/* Company */}
          <div className="relative">
            <Building className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Company Name (Optional)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm focus:ring-[#64FFDA]"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-bold disabled:opacity-50 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* Message */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.includes("Account") || msg.includes("created") || msg.includes("Wait")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* Note */}
        <div className="mt-4 p-3 bg-[#0A192F]/50 border border-[#1E2D45] rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            📋 Your account will be reviewed within 24 hours.
          </p>
        </div>

        {/* Switch to Login */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              onClose();
              onSwitchToLogin && onSwitchToLogin();
            }}
            className="text-[#64FFDA] text-sm hover:underline"
          >
            Already have an account? Login →
          </button>
        </div>

        <style jsx>{`
          @keyframes fadeIn { 
            from { opacity: 0; } 
            to { opacity: 1; } 
          }
          @keyframes scaleIn { 
            from { transform: scale(0.9); opacity: 0; } 
            to { transform: scale(1); opacity: 1; } 
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
      </div>
    </div>
  );
}
