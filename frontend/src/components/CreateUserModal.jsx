// src/components/CreateUserModal.jsx
import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  X,
  Building,
} from "lucide-react";

export default function CreateUserModal({
  form,
  setForm,
  onSubmit,
  onClose,
  msg,
  loading,
}) {

  const [companies, setCompanies] = useState([]);

  // Fetch companies for multi-select
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "https://selt-t-backend.selt-3232.workers.dev/api/companies"
        );
        const data = await res.json();
        if (data.success) setCompanies(data.companies || []);
      } catch (err) {
        console.log("Company fetch failed:", err);
      }
    }
    load();
  }, []);

  // Update helper
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle company checkbox
  const toggleCompany = (companyName) => {
    setForm((prev) => {
      let updated = [...(prev.allowedCompanies || [])];

      if (updated.includes(companyName)) {
        updated = updated.filter((c) => c !== companyName);
      } else {
        updated.push(companyName);
      }

      return { ...prev, allowedCompanies: updated };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-3xl shadow-[0_0_50px_rgba(100,255,218,0.2)] animate-scaleIn">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
        >
          <X size={24} />
        </button>

        <h2 className="text-center text-xl md:text-2xl font-bold text-[#64FFDA] mb-4">
          Create New User
        </h2>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Name */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18}/>
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18}/>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18}/>
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18}/>
            <input
              type="text"
              placeholder="Password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm text-gray-300">Select Role</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full mt-1 bg-[#0A192F] border border-[#1E2D45] text-gray-200 p-3 rounded-lg"
            >
              <option value="user">User</option>
              <option value="mis">MIS</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Login Method */}
          <div>
            <label className="text-sm text-gray-300">Login Method</label>
            <select
              value={form.loginMethod}
              onChange={(e) => update("loginMethod", e.target.value)}
              className="w-full mt-1 bg-[#0A192F] border border-[#1E2D45] text-gray-200 p-3 rounded-lg"
            >
              <option value="email">Email + Password</option>
              <option value="phone">Phone OTP</option>
            </select>
          </div>

          {/* Company Lock */}
          <div>
            <label className="text-sm text-gray-300">Company Lock</label>
            <select
              value={form.companyLockEnabled ? "true" : "false"}
              onChange={(e) =>
                update("companyLockEnabled", e.target.value === "true")
              }
              className="w-full mt-1 bg-[#0A192F] border border-[#1E2D45] text-gray-200 p-3 rounded-lg"
            >
              <option value="false">Disabled (All Companies)</option>
              <option value="true">Enable Lock (Choose Companies)</option>
            </select>
          </div>

        </div>

        {/* Multi-company Select - Only if Lock Enabled */}
        {form.companyLockEnabled && (
          <div className="mt-5 bg-[#0A192F] border border-[#1E2D45] p-4 rounded-lg">
            <h3 className="font-semibold text-[#64FFDA] mb-3 flex items-center gap-2">
              <Building size={18} /> Select Allowed Companies
            </h3>

            {companies.length === 0 ? (
              <p className="text-gray-400 text-sm">No companies found.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {companies.map((company) => (
                  <label
                    key={company}
                    className="flex items-center gap-2 text-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(form.allowedCompanies || []).includes(company)}
                      onChange={() => toggleCompany(company)}
                      className="w-4 h-4 text-[#64FFDA] bg-[#112240] border border-[#1E2D45] rounded"
                    />
                    <span>{company}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          className="w-full mt-6 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create User"}
        </button>

        {/* Message */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.toLowerCase().includes("success")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* Animation */}
        <style jsx>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1);
            }
          }
          .animate-scaleIn {
            animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>
      </div>
    </div>
  );
}
