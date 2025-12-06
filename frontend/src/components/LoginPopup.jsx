// src/components/LoginPopup.jsx
import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, X, Phone, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPopup({ onClose, onSwitchToSignup }) {
  const { login, sendOtp, verifyOtp } = useAuth();

  const [loginMethod, setLoginMethod] = useState("email");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ================================
  // EMAIL LOGIN (using AuthContext.login)
  // ================================
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    if (!role) {
      setMsg("❌ Please select a role first");
      setLoading(false);
      return;
    }

    // AuthContext.login({ email, phone, password, role }) RETURNS boolean
    const ok = await login({ email, phone: null, password, role });

    setLoading(false);

    if (!ok) {
      setMsg("❌ Invalid login. Please check credentials.");
      return;
    }

    setMsg("✅ Login Successful!");

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 600);
  };

  // ================================
  // SEND OTP (using AuthContext.sendOtp)
  // ================================
  const handleSendOTP = async () => {
    setMsg("");

    if (!phone.trim()) {
      setMsg("❌ Enter phone number");
      return;
    }

    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);

    if (!res?.success) {
      setMsg("❌ " + (res?.message || "Failed to send OTP"));
      return;
    }

    setOtpSent(true);
    setMsg(`📱 OTP sent (mock): ${res.otp || "****"}`);
  };

  // ================================
  // VERIFY OTP (using AuthContext.verifyOtp)
  // ================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!phone.trim() || !otp.trim()) {
      setMsg("❌ Phone and OTP required");
      return;
    }

    const res = await verifyOtp(phone, otp);

    if (!res?.success) {
      setMsg("❌ " + (res?.message || "Invalid OTP"));
      return;
    }

    setMsg("✅ OTP Verified!");

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-md shadow-[0_0_50px_rgba(100,255,218,0.2)] animate-scaleIn">

        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <LogIn className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-[#64FFDA]">Welcome Back</h2>
          <p className="text-gray-400 text-sm mt-1">Select role and login</p>
        </div>

        {/* ROLE SELECT */}
        <div className="mb-6">
          <label className="text-sm text-gray-300 mb-2 block">Select Your Role:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setRole("admin")}
              type="button"
              className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                role === "admin"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                  : "bg-[#1E2D45] text-gray-400 hover:bg-[#2A3F5F]"
              }`}
            >
              👑 Admin
            </button>
            <button
              onClick={() => setRole("mis")}
              type="button"
              className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                role === "mis"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  : "bg-[#1E2D45] text-gray-400 hover:bg-[#2A3F5F]"
              }`}
            >
              📊 MIS
            </button>
            <button
              onClick={() => setRole("user")}
              type="button"
              className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                role === "user"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                  : "bg-[#1E2D45] text-gray-400 hover:bg-[#2A3F5F]"
              }`}
            >
              👤 User
            </button>
          </div>
        </div>

        {/* LOGIN METHOD */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setLoginMethod("email"); setMsg(""); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={16} className="inline mr-2" /> Email
          </button>

          <button
            type="button"
            onClick={() => { setLoginMethod("phone"); setMsg(""); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={16} className="inline mr-2" /> Phone
          </button>
        </div>

        {/* EMAIL LOGIN FORM */}
        {loginMethod === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA] transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* PHONE LOGIN – OTP SEND */}
        {loginMethod === "phone" && !otpSent && (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSendOTP}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* OTP VERIFY */}
        {loginMethod === "phone" && otpSent && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="relative">
              <Shield className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="text"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold"
            >
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="text-[#64FFDA] text-sm hover:underline"
            >
              ← Change Phone Number
            </button>
          </form>
        )}

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

        <div className="mt-6 flex justify-between items-center text-sm">
          <button className="text-[#64FFDA] hover:underline">Forgot Password?</button>

          <button
            onClick={() => {
              onClose();
              onSwitchToSignup && onSwitchToSignup();
            }}
            className="text-[#64FFDA] hover:underline"
          >
            New Registration →
          </button>
        </div>
      </div>
    </div>
  );
}
