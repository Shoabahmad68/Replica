// ========================================
// SignupPopup.jsx (FINAL CLEAN PRO VERSION)
// ========================================
import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building,
  X,
  UserPlus,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function SignupPopup({ onClose, onSwitchToLogin }) {
  const { signup, loading } = useAuth();

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

  // UPDATE FIELD
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.name.trim()) {
      setMsg("❌ Full Name is required");
      return;
    }

    if (form.loginMethod === "email" && !form.email.trim()) {
      setMsg("❌ Email is required");
      return;
    }

    if (form.loginMethod === "phone" && form.phone.length < 10) {
      setMsg("❌ Valid 10-digit phone number required");
      return;
    }

    if (form.password.length < 6) {
      setMsg("❌ Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirm) {
      setMsg("❌ Passwords do not match");
      return;
    }

    const ok = await signup({
      name: form.name,
      email: form.loginMethod === "email" ? form.email : "",
      phone: form.loginMethod === "phone" ? form.phone : "",
      password: form.password,
      company: form.company || "",
      loginMethod: form.loginMethod,
    });

    if (!ok) return;
    setMsg("✅ Account created successfully. Pending admin approval.");

    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-2xl shadow-xl animate-scaleIn">

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
            <UserPlus className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#64FFDA]">
            Create Your Account
          </h2>
          <p className="text-gray-400 text-xs">
            Join Sel-T Business Intelligence Platform
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => update("loginMethod", "email")}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              form.loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" /> Email Login
          </button>

          <button
            onClick={() => update("loginMethod", "phone")}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              form.loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" /> Phone Login
          </button>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
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
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
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
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
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
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
          <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
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
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
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
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* Message */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.includes("success")
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

        {/* Animation */}
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
