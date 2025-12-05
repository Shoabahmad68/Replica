// ============================= USER MANAGEMENT (FINAL) =============================
// Fully synced with AuthContext.js — No undefined functions, no white screen.

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users, UserPlus, Edit, Trash2, Shield, Eye, Search,
  CheckCircle, XCircle, Clock, Mail, Phone, Lock,
  Settings, Save, X, AlertCircle, Crown, Activity, Building
} from "lucide-react";

import CreateUserModal from "../components/CreateUserModal";

export default function UserManagement() {
  const {
    user: currentUser,
    getAllUsers,
    approveUser,
    updateUser,
    deleteUser,
    createUser,
    canView
  } = useAuth();

  const [users, setUsers] = useState([]);
  const [load, setLoad] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdminOrMIS =
    currentUser?.role === "admin" || currentUser?.role === "mis";

  const canManageUsers = isAdminOrMIS && canView("usermanagement");

  // =========================== Load Users ================================
  useEffect(() => {
    if (!canManageUsers) return;

    async function load() {
      setLoad(true);
      const u = await getAllUsers();
      setUsers(u || []);
      setLoad(false);
    }
    load();
  }, [canManageUsers]);

  if (!canManageUsers) {
    return (
      <div className="text-center text-gray-300 text-lg p-10">
        You do not have permission to view this page.
      </div>
    );
  }

  // =========================== Filters ================================
  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((u) => String(u.status) === filterStatus);
    }

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    return result;
  }, [users, searchQuery, filterStatus, filterRole]);

  // =========================== Stats ================================
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      pending: users.filter((u) => u.status === "pending").length,
      admins: users.filter((u) => u.role === "admin").length,
      mis: users.filter((u) => u.role === "mis").length,
      regularUsers: users.filter((u) => u.role === "user").length,
    };
  }, [users]);

  // =========================== Approve / Delete ================================
  const handleApprove = async (id) => {
    if (!confirm("Approve this user?")) return;

    const res = await approveUser(id);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "active" } : u))
      );
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user?")) return;

    const res = await deleteUser(id);
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  // =========================== Create User ================================
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    company: "",
    role: "user",
    status: "active",
    loginMethod: "email",
    companyLockEnabled: false,
    allowedCompanies: []
  });

  const [createMsg, setCreateMsg] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.password) {
      setCreateMsg("❌ Fill required fields.");
      return;
    }

    setCreateLoading(true);
    const res = await createUser(createForm);
    setCreateLoading(false);

    if (!res.success) {
      setCreateMsg("❌ " + res.message);
      return;
    }

    setUsers((prev) => [...prev, res.user]);
    setCreateMsg("✅ User created.");

    setTimeout(() => {
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        company: "",
        role: "user",
        status: "active",
        loginMethod: "email",
        companyLockEnabled: false,
        allowedCompanies: []
      });
      setCreateMsg("");
    }, 1200);
  };

  // =========================== UI ================================
  return (
    <div className="p-6 min-h-screen bg-[#0A192F] text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#64FFDA] flex gap-2 items-center">
          <Users /> User Management
        </h1>

        <button
          className="bg-[#64FFDA] text-[#0A192F] px-4 py-2 rounded-lg font-bold flex gap-2 items-center"
          onClick={() => setShowCreateModal(true)}
        >
          <UserPlus size={18} /> Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Stat title="Total" val={stats.total} />
        <Stat title="Active" val={stats.active} />
        <Stat title="Pending" val={stats.pending} />
        <Stat title="Admins" val={stats.admins} />
        <Stat title="MIS" val={stats.mis} />
        <Stat title="Users" val={stats.regularUsers} />
      </div>

      {/* Filters */}
      <div className="bg-[#112240] p-4 rounded-xl border border-[#1E2D45] mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
            <input
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 py-2 rounded-lg"
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="bg-[#0A192F] border border-[#1E2D45] p-2 rounded-lg"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>

          <select
            className="bg-[#0A192F] border border-[#1E2D45] p-2 rounded-lg"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="mis">MIS</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#112240] rounded-xl border border-[#1E2D45] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0A192F]">
            <tr>
              <Th>User</Th>
              <Th>Contact</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Login Method</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-t border-[#1E2D45] hover:bg-[#0A192F]">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email || u.phone}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.status}</td>
                <td className="px-4 py-3">{u.loginMethod}</td>
                <td className="px-4 py-3 flex gap-2">
                  {u.status === "pending" && (
                    <button className="text-green-400" onClick={() => handleApprove(u.id)}>
                      <CheckCircle />
                    </button>
                  )}

                  <button className="text-red-400" onClick={() => handleDelete(u.id)}>
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          form={createForm}
          setForm={setCreateForm}
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
          msg={createMsg}
          loading={createLoading}
        />
      )}
    </div>
  );
}

// ---------------- HELPERS ----------------

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs uppercase text-gray-400">
      {children}
    </th>
  );
}

function Stat({ title, val }) {
  return (
    <div className="bg-[#112240] p-4 rounded-xl border border-[#1E2D45] text-center">
      <div className="text-xl font-bold text-white">{val}</div>
      <div className="text-xs text-gray-400 mt-1">{title}</div>
    </div>
  );
}
