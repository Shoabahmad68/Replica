// src/components/LoginPopup.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, LogIn, X, Phone, Shield } from "lucide-react";

export default function LoginPopup({ onClose, onSwitchToSignup }) {
  const { login, sendOTP, verifyOTP } = useAuth();
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    setTimeout(() => {
      const result = login(email.trim(), password.trim());
      setLoading(false);

      if (result.success) {
        setMsg("✅ Login Successful!");
        setTimeout(() => onClose(), 600);
      } else {
        setMsg(result.message || "❌ Invalid credentials");
      }
    }, 500);
  };

  const handleSendOTP = () => {
    if (!phone.trim() || phone.trim().length < 10) {
      setMsg("❌ Enter valid phone number");
      return;
    }
    setLoading(true);
    setMsg("");
    
    setTimeout(() => {
      const result = sendOTP(phone.trim());
      setLoading(false);
      
      if (result.success) {
        setOtpSent(true);
        setMsg(`✅ ${result.message}`);
      } else {
        setMsg(`❌ ${result.message}`);
      }
    }, 500);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    setTimeout(() => {
      const result = verifyOTP(phone.trim(), otp.trim());
      setLoading(false);

      if (result.success) {
        setMsg("✅ Login Successful!");
        setTimeout(() => onClose(), 600);
      } else {
        setMsg(result.message || "❌ Invalid OTP");
      }
    }, 500);
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
          <p className="text-gray-400 text-sm mt-1">Login to your account</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { 
              setLoginMethod("email"); 
              setMsg(""); 
              setOtpSent(false);
              setOtp("");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={16} className="inline mr-2" />
            Email
          </button>
          <button
            type="button"
            onClick={() => { 
              setLoginMethod("phone"); 
              setMsg(""); 
              setOtpSent(false);
              setOtp("");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={16} className="inline mr-2" />
            Phone
          </button>
        </div>

        {loginMethod === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
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
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
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
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {loginMethod === "phone" && !otpSent && (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
                placeholder="Phone Number (10 digits)"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading || !phone || phone.length < 10}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        )}

        {loginMethod === "phone" && otpSent && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="bg-[#64FFDA]/10 border border-[#64FFDA]/30 rounded-lg p-3 text-center">
              <p className="text-sm text-[#64FFDA]">OTP sent to {phone}</p>
              <p className="text-xs text-gray-400 mt-1">Valid for 5 minutes</p>
            </div>

            <div className="relative">
              <Shield className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="text"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setMsg("");
                }}
                className="flex-1 text-[#64FFDA] text-sm hover:underline py-2"
              >
                ← Change Number
              </button>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="flex-1 text-[#64FFDA] text-sm hover:underline py-2"
              >
                Resend OTP →
              </button>
            </div>
          </form>
        )}

        {msg && (
          <div className={`mt-4 p-3 rounded-lg text-center text-sm ${msg.includes('✅') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {msg}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#1E2D45] flex justify-between items-center text-sm">
          <button
            onClick={() => alert("Contact admin: admin@cw")}
            className="text-[#64FFDA] hover:underline"
          >
            Forgot Password?
          </button>
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

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-400 text-center">
            💡 Demo Accounts: admin@cw / mis@cw / user@cw (Password: role@3232)
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
}
