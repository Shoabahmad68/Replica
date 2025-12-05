// =====================================================
// FINAL SIGNUP POPUP (MATCHED with AuthContext.js)
// =====================================================

import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Building,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function SignupPopup({ onClose, onSwitchToLogin }) {
  const { signup } = useAuth();

  const [role, setRole] = useState("");
  const [loginMethod, setLoginMethod] = useState("email");

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

  // UPDATE field helper
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // --------------------------------------------
  // HANDLE SIGNUP
  // --------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!role) {
      setMsg("❌ Please select a role");
      return;
    }

    if (form.password !== form.confirm) {
      setMsg("❌ Passwords do not match!");
      return;
    }

    if (form.password.length < 6) {
      setMsg("❌ Password must be at least 6 characters");
      return;
    }

    if (loginMethod === "email" && !form.email) {
      setMsg("❌ Email required");
      return;
    }

    if (loginMethod === "phone" && !form.phone) {
      setMsg("❌ Phone required");
      return;
    }

    const payload = {
      ...form,
      role,
      loginMethod,
    };

    setLoading(true);
    const ok = await signup(payload);
    setLoading(false);

    if (ok) {
      setMsg("✅ Account created! Wait for admin approval.");
      setTimeout(onClose, 1500);
    } else {
      setMsg("❌ Registration failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-2xl shadow-[0_0_50px_rgba(100,255,218,0.2)] animate-scaleIn my-8">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <UserPlus className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#64FFDA]">
            Create Account
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            Join Sel-T Business Intelligence
          </p>
        </div>

        {/* -------------------------------------------- */}
        {/* ROLE SELECT */}
        {/* -------------------------------------------- */}

        <label className="text-sm text-gray-300 block mb-2">
          Select Your Role:
        </label>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setRole("admin")}
            className={`py-2 rounded-lg font-semibold text-sm transition ${
              role === "admin"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            👑 Admin
          </button>

          <button
            onClick={() => setRole("mis")}
            className={`py-2 rounded-lg font-semibold text-sm transition ${
              role === "mis"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            📊 MIS
          </button>

          <button
            onClick={() => setRole("user")}
            className={`py-2 rounded-lg font-semibold text-sm transition ${
              role === "user"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            👤 User
          </button>
        </div>

        {/* -------------------------------------------- */}
        {/* LOGIN METHOD SELECT */}
        {/* -------------------------------------------- */}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setLoginMethod("email");
              update("loginMethod", "email");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" /> Email Login
          </button>

          <button
            onClick={() => {
              setLoginMethod("phone");
              update("loginMethod", "phone");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" /> Phone Login
          </button>
        </div>

        {/* -------------------------------------------- */}
        {/* FORM FIELDS */}
        {/* -------------------------------------------- */}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          {loginMethod === "email" && (
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>
          )}

          {/* Phone */}
          {loginMethod === "phone" && (
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
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
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
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
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
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
              msg.includes("✅")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

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
      </div>
    </div>
  );
}
