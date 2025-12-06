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
  }, [canManageUsers]);

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
    const payload = {
      permissions: editingPermissions.permissions,
      role: editingPermissions.role,
      companyLockEnabled: editingPermissions.companyLockEnabled,
      allowedCompanies: editingPermissions.allowedCompanies,
      partyLockEnabled: editingPermissions.partyLockEnabled,
      allowedPartyGroups: editingPermissions.allowedPartyGroups,
    };

    const res = await updateUserData(editingPermissions.id, payload);
    if (!res.success) {
      alert(res.message);
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
          ...(prev.permissions[module] || {}),
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

    const res = await createUser(createForm);

    if (!res.success) return setCreateMsg("❌ " + res.message);

    setCreateMsg("✅ User created!");
    setTimeout(() => {
      setShowCreateModal(false);
      setCreateMsg("");
    }, 800);
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
                    <td colSpan="8" className="text-center py-6 text-gray-500">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#0A192F]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-xs text-gray-400">{user.company || "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {user.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} /> {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} /> {user.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            user.role === "admin"
                              ? "bg-red-500/20 text-red-400"
                              : user.role === "mis"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            user.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {user.loginMethod === "phone" ? "Phone/OTP" : "Email/Password"}
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {!user.companyLockEnabled
                          ? "All Companies"
                          : (user.allowedCompanies || []).join(", ") || "None"}
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {!user.partyLockEnabled
                          ? "All Groups"
                          : (user.allowedPartyGroups || []).length + " groups"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]"
                          >
                            <Eye size={16} />
                          </button>

                          {user.status === "pending" && (
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {user.id !== currentUser.id && (
                            <>
                              <button
                                onClick={() => handleEditPermissions(user)}
                                className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]"
                              >
                                <Settings size={16} />
                              </button>

                              <button
                                onClick={() => handleDelete(user.id)}
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
          <UserDetailsModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
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
