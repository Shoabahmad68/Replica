// src/pages/UserManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Eye,
  Search,
  CheckCircle,
  XCircle,
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
  } = useAuth();

  const isAdminOrMIS =
    currentUser?.role === "admin" || currentUser?.role === "mis";
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
    allowedCompaniesText: "", // "Samsung, Milton" type text; backend ko array bhejna
  });
  const [createMsg, setCreateMsg] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Backend se users load
  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers, fetchUsers]);

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
    const allUsers = users || [];
    return {
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === "active").length,
      pending: allUsers.filter((u) => u.status === "pending").length,
      admins: allUsers.filter((u) => u.role === "admin").length,
      mis: allUsers.filter((u) => u.role === "mis").length,
      regularUsers: allUsers.filter((u) => u.role === "user").length,
    };
  }, [users]);

  const handleApprove = async (userId) => {
    if (confirm("Approve this user account?")) {
      await approveUser(userId);
    }
  };

  const handleDelete = async (userId) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      const result = await deleteUser(userId);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const handleEditPermissions = (user) => {
    const allowedCompaniesText = (user.allowedCompanies || []).join(", ");
    setEditingPermissions({ ...user, allowedCompaniesText });
    setShowPermissionModal(true);
  };

  const handleSavePermissions = async () => {
    if (editingPermissions) {
      const allowedCompanies =
        editingPermissions.allowedCompaniesText
          ?.split(",")
          .map((c) => c.trim())
          .filter(Boolean) || [];

      const payload = {
        permissions: editingPermissions.permissions,
        role: editingPermissions.role,
        companyLockEnabled: !!editingPermissions.companyLockEnabled,
        allowedCompanies,
      };

      const result = await updateUserData(editingPermissions.id, payload);
      if (!result.success) {
        alert(result.message);
        return;
      }
      setShowPermissionModal(false);
      setEditingPermissions(null);
    }
  };

  const togglePermission = (module, permission) => {
    setEditingPermissions((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions?.[module],
          [permission]: !prev.permissions?.[module]?.[permission],
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

  const handleCreateUser = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCreateMsg("");

    if (createForm.loginMethod === "email" && !createForm.email) {
      setCreateMsg("❌ Email is required for email login");
      return;
    }

    if (createForm.loginMethod === "phone" && !createForm.phone) {
      setCreateMsg("❌ Phone is required for phone login");
      return;
    }

    if (createForm.loginMethod === "phone" && createForm.phone.length < 10) {
      setCreateMsg("❌ Enter valid 10-digit phone number");
      return;
    }

    if (!createForm.password || createForm.password.length < 6) {
      setCreateMsg("❌ Password must be at least 6 characters");
      return;
    }

    const allowedCompanies =
      createForm.allowedCompaniesText
        ?.split(",")
        .map((c) => c.trim())
        .filter(Boolean) || [];

    const payload = {
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone,
      password: createForm.password,
      company: createForm.company,
      role: createForm.role,
      status: createForm.status,
      loginMethod: createForm.loginMethod,
      companyLockEnabled: !!createForm.companyLockEnabled,
      allowedCompanies,
    };

    setCreateLoading(true);
    const result = await createUser(payload);
    setCreateLoading(false);

    if (result.success) {
      setCreateMsg("✅ User created successfully");
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
          allowedCompaniesText: "",
        });
        setCreateMsg("");
      }, 1200);
    } else {
      setCreateMsg(`❌ ${result.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#112240] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#64FFDA] flex items-center gap-3">
              <Users size={32} />
              User Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage users, roles, and permissions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all flex items-center gap-2"
            >
              <UserPlus size={18} />
              Create User
            </button>
            <div className="px-4 py-2 bg-[#64FFDA]/10 rounded-lg border border-[#64FFDA]/30">
              <div className="text-xs text-gray-400">Logged in as</div>
              <div className="text-[#64FFDA] font-semibold flex items-center gap-2">
                {currentUser?.role === "admin" && <Crown size={16} />}
                {currentUser?.name} ({currentUser?.role})
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={<Users size={20} />}
            color="blue"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle size={20} />}
            color="green"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Clock size={20} />}
            color="yellow"
          />
          <StatCard
            title="Admins"
            value={stats.admins}
            icon={<Crown size={20} />}
            color="red"
          />
          <StatCard
            title="MIS"
            value={stats.mis}
            icon={<Shield size={20} />}
            color="purple"
          />
          <StatCard
            title="Users"
            value={stats.regularUsers}
            icon={<Users size={20} />}
            color="cyan"
          />
        </div>

        {/* Filters */}
        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, email, phone, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-2 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0A192F] border border-[#1E2D45] px-4 py-2 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-[#0A192F] border border-[#1E2D45] px-4 py-2 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mis">MIS</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A192F] border-b border-[#1E2D45]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Login Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Company Access
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D45]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[#0A192F] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {user.company || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Mail size={14} className="text-gray-500" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Phone size={14} className="text-gray-500" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-red-500/20 text-red-400"
                              : user.role === "mis"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {user.role === "admin" && <Crown size={12} />}
                          {user.role === "mis" && <Shield size={12} />}
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {user.status === "active" ? (
                            <CheckCircle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {user.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-400">
                          {user.loginMethod === "email"
                            ? "Email/Password"
                            : "Phone/OTP"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.companyLockEnabled ? (
                          <div className="flex flex-wrap gap-1">
                            {(user.allowedCompanies || []).length === 0 ? (
                              <span className="text-xs text-gray-500">
                                No companies set
                              </span>
                            ) : (
                              user.allowedCompanies.map((c) => (
                                <span
                                  key={c}
                                  className="px-2 py-1 bg-[#0A192F] border border-[#1E2D45] rounded-full text-xs text-[#64FFDA]"
                                >
                                  {c}
                                </span>
                              ))
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No lock (All companies)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA] transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>

                          {user.status === "pending" && (
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                              title="Approve User"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {user.id !== currentUser.id && (
                            <>
                              <button
                                onClick={() => handleEditPermissions(user)}
                                className="p-2 rounded-lg bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA] transition-colors"
                                title="Edit Permissions"
                              >
                                <Settings size={16} />
                              </button>

                              {currentUser.role === "admin" && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
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

        {/* Modals */}
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
          />
        )}

        {showCreateModal && (
          <CreateUserModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateUser}
            onClose={() => {
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
                allowedCompaniesText: "",
              });
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

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
    red: "from-red-500/20 to-red-600/20 border-red-500/30",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-gray-400 uppercase">{title}</div>
    </div>
  );
}

function UserProfileView({ user }) {
  const modules = [
    "dashboard",
    "reports",
    "hierarchy",
    "outstanding",
    "analyst",
    "messaging",
    "usermanagement",
    "setting",
    "helpsupport",
  ];

  const accessibleModules = modules.filter((mod) => user?.permissions?.[mod]?.view);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#112240] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-block w-24 h-24 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-4xl font-bold text-[#0A192F] mb-4">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
          <p className="text-gray-400">{user?.email || user?.phone}</p>
          <span className="inline-block mt-2 px-4 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
            {user?.role?.toUpperCase()}
          </span>
        </div>

        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] p-6">
          <h2 className="text-xl font-bold text-[#64FFDA] mb-4">
            Profile Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Name" value={user?.name} />
            <InfoItem label="Email" value={user?.email || "—"} />
            <InfoItem label="Phone" value={user?.phone || "—"} />
            <InfoItem label="Company" value={user?.company || "—"} />
            <InfoItem label="Role" value={user?.role} />
            <InfoItem
              label="Login Method"
              value={
                user?.loginMethod === "email" ? "Email/Password" : "Phone/OTP"
              }
            />
            <InfoItem
              label="Company Lock"
              value={
                user?.companyLockEnabled
                  ? (user.allowedCompanies || []).join(", ") || "No companies set"
                  : "No lock (All companies)"
              }
            />
          </div>
        </div>

        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] p-6">
          <h2 className="text-xl font-bold text-[#64FFDA] mb-4 flex items-center gap-2">
            <Shield size={20} />
            Your Access Permissions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accessibleModules.map((mod) => (
              <div
                key={mod}
                className="bg-[#0A192F] rounded-lg p-3 border border-[#1E2D45]"
              >
                <div className="font-medium text-white capitalize mb-2">
                  {mod}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["view", "create", "edit", "delete", "export"].map(
                    (perm) =>
                      user?.permissions?.[mod]?.[perm] && (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs"
                        >
                          {perm}
                        </span>
                      )
                  )}
                </div>
              </div>
            ))}
          </div>
          {accessibleModules.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <AlertCircle size={48} className="mx-auto mb-3 text-gray-600" />
              <p>No modules accessible. Contact admin for access.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-[#0A192F] rounded-lg p-3 border border-[#1E2D45]">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-white font-medium">{value || "—"}</div>
    </div>
  );
}

function UserDetailsModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#112240] rounded-xl border border-[#1E2D45] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#112240] border-b border-[#1E2D45] p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#64FFDA]">User Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#0A192F] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-block w-20 h-20 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-3xl font-bold text-[#0A192F] mb-3">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h4 className="text-2xl font-bold text-white">{user.name}</h4>
            <p className="text-gray-400">{user.company || "No company"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailCard label="Email" value={user.email || "—"} icon={<Mail size={16} />} />
            <DetailCard label="Phone" value={user.phone || "—"} icon={<Phone size={16} />} />
            <DetailCard label="Role" value={user.role} icon={<Shield size={16} />} />
            <DetailCard label="Status" value={user.status} icon={<Activity size={16} />} />
            <DetailCard
              label="Login Method"
              value={user.loginMethod === "email" ? "Email/Password" : "Phone/OTP"}
              icon={<Lock size={16} />}
            />
            <DetailCard
              label="Company Lock"
              value={
                user.companyLockEnabled
                  ? (user.allowedCompanies || []).join(", ") || "No companies set"
                  : "No lock (All companies)"
              }
              icon={<Building size={16} />}
            />
            <DetailCard
              label="Account Created"
              value={new Date(user.createdAt).toLocaleDateString()}
              icon={<Clock size={16} />}
            />
          </div>

          <div className="bg-[#0A192F] rounded-lg p-4 border border-[#1E2D45]">
            <h5 className="font-semibold text-white mb-3">Permissions Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(user.permissions || {}).map(([module, perms]) => {
                const activePerms = Object.entries(perms)
                  .filter(([_, v]) => v)
                  .map(([k]) => k);
                if (activePerms.length === 0) return null;
                return (
                  <div key={module} className="bg-[#112240] rounded p-2">
                    <div className="text-xs font-medium text-[#64FFDA] capitalize">
                      {module}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {activePerms.join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, icon }) {
  return (
    <div className="bg-[#0A192F] rounded-lg p-3 border border-[#1E2D45]">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-white font-medium capitalize">{value}</div>
    </div>
  );
}

function PermissionEditorModal({
  user,
  onClose,
  onSave,
  togglePermission,
  setAllModulePermissions,
  setEditingPermissions,
}) {
  const modules = [
    "dashboard",
    "reports",
    "hierarchy",
    "outstanding",
    "analyst",
    "messaging",
    "usermanagement",
    "setting",
    "helpsupport",
  ];

  const permissions = ["view", "create", "edit", "delete", "export"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#112240] rounded-xl border border-[#1E2D45] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#112240] border-b border-[#1E2D45] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#64FFDA]">Edit Permissions</h3>
            <p className="text-sm text-gray-400">
              {user.name} - {user.email || user.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#0A192F] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Role */}
          <div className="bg-[#0A192F] rounded-lg p-4 border border-[#1E2D45]">
            <label className="text-sm text-gray-400 mb-2 block">User Role</label>
            <select
              value={user.role}
              onChange={(e) =>
                setEditingPermissions((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full bg-[#112240] border border-[#1E2D45] px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
            >
              <option value="user">User</option>
              <option value="mis">MIS</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Company Lock Config */}
          <div className="bg-[#0A192F] rounded-lg p-4 border border-[#1E2D45] space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Building size={18} />
              Company Access Lock
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Lock Enabled
                </label>
                <select
                  value={user.companyLockEnabled ? "true" : "false"}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({
                      ...prev,
                      companyLockEnabled: e.target.value === "true",
                    }))
                  }
                  className="w-full bg-[#112240] border border-[#1E2D45] px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
                >
                  <option value="false">Disabled (All companies)</option>
                  <option value="true">Enabled (Limit companies)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Allowed Companies (comma separated)
                </label>
                <input
                  type="text"
                  value={user.allowedCompaniesText || ""}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({
                      ...prev,
                      allowedCompaniesText: e.target.value,
                    }))
                  }
                  placeholder="Samsung, Milton, Zebronics"
                  className="w-full bg-[#112240] border border-[#1E2D45] px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500">
              Enter company names exactly as shown in filters (e.g. "Samsung",
              "Milton"). User will only see data for these companies when lock
              is enabled.
            </p>
          </div>

          {/* Permission Matrix */}
          <div className="space-y-4">
            {modules.map((module) => (
              <div
                key={module}
                className="bg-[#0A192F] rounded-lg p-4 border border-[#1E2D45]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white capitalize">
                    {module}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllModulePermissions(module, true)}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                    >
                      All ON
                    </button>
                    <button
                      onClick={() => setAllModulePermissions(module, false)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                    >
                      All OFF
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {permissions.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={user.permissions?.[module]?.[perm] || false}
                        onChange={() => togglePermission(module, perm)}
                        className="w-4 h-4 rounded border-[#1E2D45] bg-[#112240] text-[#64FFDA] focus:ring-2 focus:ring-[#64FFDA]"
                      />
                      <span className="text-sm text-gray-300 capitalize">
                        {perm}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#0A192F] text-white rounded-lg hover:bg-[#1E2D45] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-6 py-2 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] rounded-lg font-bold hover:shadow-[0_0_30px_rgba(100,255,218,0.4)] transition-all"
            >
              <Save size={16} className="inline mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
