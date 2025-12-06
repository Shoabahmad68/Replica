// src/pages/UserManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Eye,
  Search,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Lock,
  Settings,
  Save,
  X,
  AlertCircle,
  Crown,
  Activity,
  Building,
} from "lucide-react";

import CreateUserModal from "../components/CreateUserModal";

export default function UserManagement() {
  const {
    user: currentUser,
    users,
    approveUser,
    updateUserData,
    deleteUser,
    createUser,
    canAccess,
    fetchUsers,
    isAdmin,
    isMIS,
    companies,
    partyGroups,
  } = useAuth();

  const isAdminOrMIS = isAdmin || isMIS;
  const canManageUsers = isAdminOrMIS && canAccess("usermanagement");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(null);

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
    partyLockEnabled: false,
    allowedCompanies: [],
    allowedPartyGroups: [],
  });
  const [createMsg, setCreateMsg] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Load all users on mount
  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers, fetchUsers]);

  // अगर permission नहीं है तो सिर्फ अपना profile दिखे
  if (!canManageUsers) {
    return <UserProfileView user={currentUser} />;
  }

  const filteredUsers = useMemo(() => {
    let result = users || [];

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
      result = result.filter((u) => u.status === filterStatus);
    }

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    return result;
  }, [users, searchQuery, filterStatus, filterRole]);

  const stats = useMemo(() => {
    const all = users || [];
    return {
      total: all.length,
      active: all.filter((u) => u.status === "active").length,
      pending: all.filter((u) => u.status === "pending").length,
      admins: all.filter((u) => u.role === "admin").length,
      mis: all.filter((u) => u.role === "mis").length,
      regularUsers: all.filter((u) => u.role === "user").length,
    };
  }, [users]);

  const handleApprove = async (userId) => {
    if (!window.confirm("Approve this user?")) return;
    const res = await approveUser(userId);
    if (!res.success) alert(res.message);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    const res = await deleteUser(userId);
    if (!res.success) alert(res.message);
  };

  const handleEditPermissions = (user) => {
    setEditingPermissions({
      ...user,
      permissions: user.permissions || {},
      allowedCompanies: user.allowedCompanies || [],
      allowedPartyGroups: user.allowedPartyGroups || [],
      companyLockEnabled: !!user.companyLockEnabled,
      partyLockEnabled: !!user.partyLockEnabled,
    });
    setShowPermissionModal(true);
  };

  const handleSavePermissions = async () => {
    if (!editingPermissions) return;

    const payload = {
      permissions: editingPermissions.permissions,
      role: editingPermissions.role,
      status: editingPermissions.status,
      loginMethod: editingPermissions.loginMethod,
      companyLockEnabled: editingPermissions.companyLockEnabled,
      allowedCompanies: editingPermissions.allowedCompanies,
      partyLockEnabled: editingPermissions.partyLockEnabled,
      allowedPartyGroups: editingPermissions.allowedPartyGroups,
    };

    const res = await updateUserData(editingPermissions.id, payload);
    if (!res.success) {
      alert(res.message || "Failed to update user");
      return;
    }

    setShowPermissionModal(false);
    setEditingPermissions(null);
  };

  const togglePermission = (module, perm) => {
    setEditingPermissions((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...(prev.permissions?.[module] || {}),
          [perm]: !prev.permissions?.[module]?.[perm],
        },
      },
    }));
  };

  const setAllModulePermissions = (module, value) => {
    setEditingPermissions((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          view: value,
          create: value,
          edit: value,
          delete: value,
          export: value,
        },
      },
    }));
  };

  const handleCreateUser = async () => {
    setCreateMsg("");

    if (createForm.loginMethod === "email" && !createForm.email)
      return setCreateMsg("❌ Email required");

    if (createForm.loginMethod === "phone") {
      if (!createForm.phone) return setCreateMsg("❌ Phone required");
      if (createForm.phone.length < 10)
        return setCreateMsg("❌ Enter valid phone");
    }

    if (!createForm.password || createForm.password.length < 6)
      return setCreateMsg("❌ Password must be at least 6 characters");

    try {
      setCreateLoading(true);
      const res = await createUser(createForm);
      setCreateLoading(false);

      if (!res.success) return setCreateMsg("❌ " + (res.message || "Failed"));

      setCreateMsg("✅ User created!");
      setCreateForm((f) => ({
        ...f,
        name: "",
        email: "",
        phone: "",
        password: "",
        company: "",
        role: "user",
        status: "active",
      }));

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg("");
      }, 800);
    } catch (e) {
      setCreateLoading(false);
      setCreateMsg("❌ Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#112240] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#64FFDA] flex items-center gap-3">
              <Users size={32} /> User Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage users, roles, and permissions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] rounded-lg font-bold"
          >
            <UserPlus size={18} className="inline mr-2" /> Create User
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Total Users" value={stats.total} icon={<Users />} color="blue" />
          <StatCard title="Active" value={stats.active} icon={<CheckCircle />} color="green" />
          <StatCard title="Pending" value={stats.pending} icon={<Clock />} color="yellow" />
          <StatCard title="Admins" value={stats.admins} icon={<Crown />} color="red" />
          <StatCard title="MIS" value={stats.mis} icon={<Shield />} color="purple" />
          <StatCard title="Users" value={stats.regularUsers} icon={<Users />} color="cyan" />
        </div>

        {/* FILTERS */}
        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-2 rounded-lg text-gray-200"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0A192F] border border-[#1E2D45] px-4 py-2 rounded-lg text-gray-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-[#0A192F] border border-[#1E2D45] px-4 py-2 rounded-lg text-gray-200"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mis">MIS</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A192F] border-b border-[#1E2D45]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Login</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Party</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1E2D45]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-6 text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#0A192F]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.company || "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {u.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} /> {u.email}
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} /> {u.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            u.role === "admin"
                              ? "bg-red-500/20 text-red-400"
                              : u.role === "mis"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            u.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {u.status?.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {u.loginMethod === "phone" ? "Phone/OTP" : "Email/Password"}
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {!u.companyLockEnabled
                          ? "All Companies"
                          : (u.allowedCompanies || []).join(", ") || "None"}
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {!u.partyLockEnabled
                          ? "All Groups"
                          : (u.allowedPartyGroups || []).length + " groups"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]"
                          >
                            <Eye size={16} />
                          </button>

                          {u.status === "pending" && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {u.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => handleEditPermissions(u)}
                                className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]"
                              >
                                <Settings size={16} />
                              </button>

                              <button
                                onClick={() => handleDelete(u.id)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS */}
        {selectedUser && (
          <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}

        {showPermissionModal && editingPermissions && (
          <PermissionEditorModal
            user={editingPermissions}
            onClose={() => {
              setShowPermissionModal(false);
              setEditingPermissions(null);
            }}
            onSave={handleSavePermissions}
            togglePermission={togglePermission}
            setAllModulePermissions={setAllModulePermissions}
            setEditingPermissions={setEditingPermissions}
            companies={companies}
            partyGroups={partyGroups}
          />
        )}

        {showCreateModal && (
          <CreateUserModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateUser}
            onClose={() => {
              setShowCreateModal(false);
              setCreateMsg("");
            }}
            msg={createMsg}
            loading={createLoading}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ COMPONENTS ------------------------------ */

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
    red: "from-red-500/20 to-red-600/20 border-red-500/30",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-gray-400 uppercase">{title}</div>
    </div>
  );
}

/* ---------------------- USER PROFILE VIEW (for normal user) ---------------------- */

function UserProfileView({ user }) {
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A192F] to-[#112240]">
        <div className="text-center text-gray-300">
          <Activity className="mx-auto mb-3 text-[#64FFDA]" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#112240] p-6">
      <div className="max-w-3xl mx-auto bg-[#112240] border border-[#1E2D45] rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] text-2xl font-bold">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {user.name}
              {user.role === "admin" && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                  <Crown size={12} /> ADMIN
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-400">Your profile & access overview</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Mail size={16} /> {user.email || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} /> {user.phone || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Building size={16} /> {user.company || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} /> Role:{" "}
              <span className="font-semibold uppercase">{user.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={16} /> Login:{" "}
              {user.loginMethod === "phone" ? "Phone/OTP" : "Email/Password"}
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Activity size={16} /> Status:{" "}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user.status === "active"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}
              >
                {user.status?.toUpperCase()}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Company access</p>
              <p className="text-xs">
                {!user.companyLockEnabled
                  ? "You can view all companies."
                  : `Restricted to: ${(user.allowedCompanies || []).join(", ") || "None"}`}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Party group access</p>
              <p className="text-xs">
                {!user.partyLockEnabled
                  ? "You can view all party groups."
                  : `Limited groups: ${(user.allowedPartyGroups || []).length}`}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t border-[#1E2D45] pt-3">
          For any change in role or access, please contact your administrator.
        </div>
      </div>
    </div>
  );
}

/* ---------------------- USER DETAILS MODAL ---------------------- */

function UserDetailsModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0B1727] border border-[#1E2D45] rounded-2xl max-w-xl w-full p-6 z-50 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <Eye size={18} /> User Details
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] text-2xl font-bold">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{user.name}</div>
            <div className="text-xs text-gray-400">{user.company || "—"}</div>
            <div className="mt-1 flex gap-2 items-center text-xs">
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${
                  user.role === "admin"
                    ? "bg-red-500/20 text-red-300"
                    : user.role === "mis"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-green-500/20 text-green-300"
                }`}
              >
                {user.role?.toUpperCase()}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${
                  user.status === "active"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}
              >
                {user.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail size={16} /> {user.email || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} /> {user.phone || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Lock size={16} /> Login:{" "}
              {user.loginMethod === "phone" ? "Phone/OTP" : "Email/Password"}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400">Company access: </span>
              {!user.companyLockEnabled
                ? "All Companies"
                : (user.allowedCompanies || []).join(", ") || "None"}
            </div>
            <div>
              <span className="text-gray-400">Party group access: </span>
              {!user.partyLockEnabled
                ? "All Groups"
                : `${(user.allowedPartyGroups || []).length} groups`}
            </div>
            {user.createdAt && (
              <div>
                <span className="text-gray-400">Created: </span>
                {new Date(user.createdAt).toLocaleString()}
              </div>
            )}
            {user.lastLogin && (
              <div>
                <span className="text-gray-400">Last login: </span>
                {new Date(user.lastLogin).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E2D45] hover:bg-[#243557] text-gray-100 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- PERMISSION EDITOR MODAL ---------------------- */

function PermissionEditorModal({
  user,
  onClose,
  onSave,
  togglePermission,
  setAllModulePermissions,
  setEditingPermissions,
  companies = [],
  partyGroups = [],
}) {
  const modules = [
    { key: "dashboard", label: "Dashboard" },
    { key: "reports", label: "Reports" },
    { key: "companyhierarchy", label: "Company Hierarchy" },
    { key: "outstanding", label: "Outstanding" },
    { key: "analyst", label: "Analyst" },
    { key: "messaging", label: "Messaging" },
    { key: "usermanagement", label: "User Management" },
    { key: "settings", label: "Settings" },
    { key: "help", label: "Help & Support" },
  ];

  const toggleInArray = (field, value) => {
    setEditingPermissions((prev) => {
      const list = new Set(prev[field] || []);
      if (list.has(value)) list.delete(value);
      else list.add(value);
      return { ...prev, [field]: Array.from(list) };
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-2 md:px-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0B1727] border border-[#1E2D45] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden z-50 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E2D45] bg-[#0A192F]">
          <div className="flex items-center gap-2">
            <Settings className="text-[#64FFDA]" size={18} />
            <h3 className="text-lg font-semibold text-white">
              Edit Permissions – {user.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid md:grid-cols-[260px,1fr] gap-4 p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
          {/* LEFT SIDEBAR – BASIC INFO & LOCKS */}
          <div className="bg-[#0A192F] border border-[#1E2D45] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-gray-400">{user.email || user.phone}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-200">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Role
                </label>
                <select
                  value={user.role}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0B1727] border border-[#1E2D45] rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="admin">Admin</option>
                  <option value="mis">MIS</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={user.status}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0B1727] border border-[#1E2D45] rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Login Method
                </label>
                <select
                  value={user.loginMethod || "email"}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({
                      ...prev,
                      loginMethod: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0B1727] border border-[#1E2D45] rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="email">Email / Password</option>
                  <option value="phone">Phone / OTP</option>
                </select>
              </div>

              {/* COMPANY LOCK */}
              <div className="mt-3 border-t border-[#1E2D45] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-400">
                    Company Access Lock
                  </span>
                  <button
                    onClick={() =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        companyLockEnabled: !prev.companyLockEnabled,
                      }))
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                      user.companyLockEnabled
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    <Lock size={11} />
                    {user.companyLockEnabled ? "Locked" : "All"}
                  </button>
                </div>

                {user.companyLockEnabled && (
                  <div className="space-y-1 max-h-32 overflow-auto text-[11px]">
                    {companies && companies.length > 0 ? (
                      companies.map((c) => (
                        <label
                          key={c.id || c.name}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-[#64FFDA]"
                            checked={(user.allowedCompanies || []).includes(
                              c.name || c.companyName || c
                            )}
                            onChange={() =>
                              toggleInArray(
                                "allowedCompanies",
                                c.name || c.companyName || c
                              )
                            }
                          />
                          <span>{c.name || c.companyName || c}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-[11px] text-gray-500">
                        No company list available
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PARTY LOCK */}
              <div className="mt-3 border-t border-[#1E2D45] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-400">
                    Party Group Access
                  </span>
                  <button
                    onClick={() =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        partyLockEnabled: !prev.partyLockEnabled,
                      }))
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                      user.partyLockEnabled
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    <Lock size={11} />
                    {user.partyLockEnabled ? "Locked" : "All"}
                  </button>
                </div>

                {user.partyLockEnabled && (
                  <div className="space-y-1 max-h-32 overflow-auto text-[11px]">
                    {partyGroups && partyGroups.length > 0 ? (
                      partyGroups.map((g) => (
                        <label
                          key={g.id || g.name}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-[#64FFDA]"
                            checked={(user.allowedPartyGroups || []).includes(
                              g.name || g.groupName || g
                            )}
                            onChange={() =>
                              toggleInArray(
                                "allowedPartyGroups",
                                g.name || g.groupName || g
                              )
                            }
                          />
                          <span>{g.name || g.groupName || g}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-[11px] text-gray-500">
                        No party group list available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – PERMISSION MATRIX */}
          <div className="bg-[#0A192F] border border-[#1E2D45] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <Shield size={16} className="text-[#64FFDA]" />
                <span>Module Permissions</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <AlertCircle size={12} />
                <span>Click on toggle to allow / deny</span>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#020817] text-gray-400">
                    <th className="text-left px-2 py-2">Module</th>
                    <th className="px-2 py-2">View</th>
                    <th className="px-2 py-2">Create</th>
                    <th className="px-2 py-2">Edit</th>
                    <th className="px-2 py-2">Delete</th>
                    <th className="px-2 py-2">Export</th>
                    <th className="px-2 py-2">ALL</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => {
                    const perms = user.permissions?.[m.key] || {};
                    const allOn =
                      perms.view &&
                      perms.create &&
                      perms.edit &&
                      perms.delete &&
                      perms.export;
                    return (
                      <tr
                        key={m.key}
                        className="border-t border-[#1E2D45] hover:bg-[#050F1F]"
                      >
                        <td className="px-2 py-2 text-gray-200 text-left">
                          {m.label}
                        </td>
                        {["view", "create", "edit", "delete", "export"].map(
                          (p) => (
                            <td key={p} className="px-2 py-2 text-center">
                              <button
                                onClick={() => togglePermission(m.key, p)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px]
                                  ${
                                    perms[p]
                                      ? "bg-[#64FFDA]/20 border-[#64FFDA] text-[#64FFDA]"
                                      : "bg-transparent border-[#1E2D45] text-gray-500"
                                  }`}
                              >
                                {perms[p] ? "✓" : "-"}
                              </button>
                            </td>
                          )
                        )}
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() =>
                              setAllModulePermissions(m.key, !allOn)
                            }
                            className={`px-3 py-1 rounded-full border text-[10px]
                              ${
                                allOn
                                  ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                                  : "bg-transparent border-[#1E2D45] text-gray-400"
                              }`}
                          >
                            {allOn ? "On" : "Off"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#1E2D45] hover:bg-[#243557] text-gray-100 text-xs flex items-center gap-1"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] text-xs font-semibold flex items-center gap-1"
              >
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
