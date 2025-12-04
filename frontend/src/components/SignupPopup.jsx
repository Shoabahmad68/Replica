// src/components/SignupPopup.jsx
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
  UserCog,
  X,
} from "lucide-react";

export default function SignupPopup({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirm: "",
    loginMethod: "email",
    role: "user", // ADDED
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://selt-t-backend.selt-3232.workers.dev";

  // ===========================================
  // SUBMIT HANDLER
  // ===========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.password !== form.confirm) {
      return setMsg("❌ Passwords do not match");
    }
    if (form.password.length < 6) {
      return setMsg("❌ Password must be at least 6 characters");
    }
    if (form.loginMethod === "email" && !form.email.trim()) {
      return setMsg("❌ Email required");
    }
    if (form.loginMethod === "phone" && !form.phone.trim()) {
      return setMsg("❌ Phone required");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // FIXED KEYS FOR BACKEND
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          company: form.company,
          loginMethod: form.loginMethod,
          login_method: form.loginMethod,
          role: form.role, // ADDED
        }),
      });

      const data = await res.json();
      setLoading(false);
      setMsg(data.message || "Unexpected response");

      if (data.success) {
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setLoading(false);
      setMsg("❌ Network error");
    }
  };

  // ===========================================
  // UI STARTS
  // ===========================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn overflow-y-auto p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-2xl shadow-xl animate-scaleIn my-8">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <UserPlus className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-[#64FFDA]">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1">
            Join Sel-T Business Intelligence
          </p>
        </div>

        {/* ROLE SELECTOR */}
        <div className="mb-4 relative">
          <UserCog className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-[#0A192F] border border-[#1E2D45] py-3 pl-10 pr-4 rounded-lg text-gray-200"
          >
            <option value="user">User</option>
            <option value="mis">MIS</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* LOGIN METHOD SWITCH */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "email" })}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              form.loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" /> Email
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "phone" })}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              form.loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" /> Phone
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* NAME */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* EMAIL */}
          {form.loginMethod === "email" && (
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          )}

          {/* PHONE */}
          {form.loginMethod === "phone" && (
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
          )}

          {/* COMPANY */}
          <div className="relative">
            <Building className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Company (Optional)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
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

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200"
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

          {/* SUBMIT */}
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

        {/* MESSAGE */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.includes("created")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* NOTIFICATION */}
        <div className="mt-4 p-3 bg-[#0A192F]/50 border border-[#1E2D45] rounded-lg text-center text-xs text-gray-400">
          Your account will be reviewed by admin.
        </div>

        {/* SWITCH TO LOGIN */}
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
