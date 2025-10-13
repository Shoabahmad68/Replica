// src/components/SignupPopup.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function SignupPopup({ onClose }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [msg, setMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setMsg("Passwords do not match!");
    const result = signup(form);
    setMsg(result.message);
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-[#0f1a2b] w-[90%] max-w-lg rounded-xl border border-[#1f3555] p-6 text-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#64FFDA]">Create New Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <input placeholder="Full Name" className="bg-[#071e30] p-2 rounded" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/>
          <input placeholder="Email" className="bg-[#071e30] p-2 rounded" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/>
          <input placeholder="Phone" className="bg-[#071e30] p-2 rounded" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/>
          <input type="password" placeholder="Password" className="bg-[#071e30] p-2 rounded" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/>
          <input type="password" placeholder="Confirm Password" className="bg-[#071e30] p-2 rounded" value={form.confirm} onChange={(e)=>setForm({...form,confirm:e.target.value})}/>
          <button type="submit" className="bg-[#64FFDA] text-[#0A192F] py-2 rounded font-semibold hover:opacity-90">Sign Up</button>
        </form>

        {msg && <div className="text-center text-sm text-green-400 mt-3">{msg}</div>}
      </div>
    </div>
  );
}
