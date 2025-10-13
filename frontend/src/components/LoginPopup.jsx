import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPopup({ onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    const result = login(email.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      setMsg("✅ Login Successful");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setMsg("❌ Invalid Email or Password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0f1a2b] p-6 rounded-xl border border-[#1f3555] w-[90%] max-w-sm text-gray-200 relative">
        <h2 className="text-lg font-semibold text-[#64FFDA] mb-4 text-center">
          Login to MARS
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            className="w-full bg-[#071e30] border border-[#1f3555] p-2 rounded focus:ring-2 focus:ring-[#64FFDA] outline-none"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            className="w-full bg-[#071e30] border border-[#1f3555] p-2 rounded focus:ring-2 focus:ring-[#64FFDA] outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#64FFDA] text-[#0A192F] py-2 rounded font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {msg && <p className="text-center text-sm mt-3">{msg}</p>}

        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
