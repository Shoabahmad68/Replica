// ===============================
// LoginPopup.jsx (FINAL)
// ===============================
import React, { useState } from "react";
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function LoginPopup({ onClose, onSwitchToSignup }) {
  const { login, loading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
    loginMethod: "email",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.loginMethod === "email" && !form.email) {
      setMsg("❌ Email required");
      return;
    }

    if (form.loginMethod === "phone" && form.phone.length < 10) {
      setMsg("❌ Valid phone required");
      return;
    }

    if (!form.password) {
      setMsg("❌ Password missing");
      return;
    }

    const ok = await login({
      email: form.email || null,
      phone: form.phone || null,
      password: form.password,
      role: form.role,
    });

    if (!ok) {
      setMsg("❌ Invalid credentials");
      return;
    }

    setMsg("Login successful...");
    setTimeout(() => onClose(), 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-xl shadow-xl animate-scaleIn">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <ShieldCheck className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#64FFDA]">
            Login to Sel-T
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Secure access to your dashboard
          </p>
        </div>

        {/* Login Method */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setForm({ ...form, loginMethod: "email" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              form.loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" />
            Email Login
          </button>

          <button
            onClick={() => setForm({ ...form, loginMethod: "phone" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              form.loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" />
            Phone Login
          </button>
        </div>

        {/* Role Selection */}
        <div className="mb-4">
          <label className="text-xs text-gray-400">Login As</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-[#0A192F] border border-[#1E2D45] text-gray-200 px-4 py-2 rounded-lg mt-1"
          >
            <option value="user">User</option>
            <option value="mis">MIS</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          {form.loginMethod === "email" && (
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-[#64FFDA]/60" />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#0A192F] border border-[#1E2D45] text-gray-200 pl-10 pr-4 py-3 rounded-lg"
              />
            </div>
          )}

          {/* Phone */}
          {form.loginMethod === "phone" && (
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-3 text-[#64FFDA]/60" />
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-[#0A192F] border border-[#1E2D45] text-gray-200 pl-10 pr-4 py-3 rounded-lg"
              />
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-3 text-[#64FFDA]/60" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#0A192F] border border-[#1E2D45] text-gray-200 pl-10 pr-12 py-3 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>

        {/* Message */}
        {msg && (
          <div
            className={`mt-4 p-3 text-center text-sm rounded-lg ${
              msg.includes("successful")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* Switch to Signup */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              onClose();
              onSwitchToSignup && onSwitchToSignup();
            }}
            className="text-[#64FFDA] text-sm hover:underline"
          >
            Don’t have an account? Sign Up →
          </button>
        </div>

        {/* Animations */}
        <style jsx>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .animate-scaleIn {
            animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>
      </div>
    </div>
  );
}
