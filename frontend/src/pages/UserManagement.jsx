// ===============================================
//  USER MANAGEMENT — FINAL FULL VERSION (v4.0)
// ===============================================

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

  // NEW createForm (FULL MATCH with CreateUserModal)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
    loginMethod: "email",
    companyLockEnabled: false,
    allowedCompanies: [],
  });

  const [createMsg, setCreateMsg] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editingPermissions, setEditingPermissions] = useState(null);


  // FETCH USERS
  useEffect(() => {
    if (canManageUsers) fetchUsers();
  }, [canManageUsers, fetchUsers]);


  if (!canManageUsers) {
    return <UserProfileView user={currentUser} />;
  }

  // ===========================================
  // FILTER USERS
  // ===========================================
  const filteredUsers = useMemo(() => {
    let result = users || [];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
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


  // ===========================================
  // STATS 
  // ===========================================
  const stats = useMemo(() => {
    const u = users || [];
    return {
      total: u.length,
      active: u.filter((a) => a.status === "active").length,
      pending: u.filter((a) => a.status === "pending").length,
      admins: u.filter((a) => a.role === "admin").length,
      mis: u.filter((a) => a.role === "mis").length,
      regularUsers: u.filter((a) => a.role === "user").length,
    };
  }, [users]);


  // ===========================================
  // ACTION HANDLERS 
  // ===========================================
  const handleApprove = async (id) => {
    if (confirm("Approve this user?")) await approveUser(id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete user permanently?")) return;
    await deleteUser(id);
  };


  const handleEditPermissions = (user) => {
    setEditingPermissions({
      ...user,
      allowedCompaniesText: (user.allowedCompanies || []).join(", "),
    });
    setShowPermissionModal(true);
  };


  const handleSavePermissions = async () => {
    const u = editingPermissions;

    const allowedCompanies =
      u.allowedCompaniesText
        ?.split(",")
        .map((c) => c.trim())
        .filter(Boolean) || [];

    const payload = {
      role: u.role,
      companyLockEnabled: u.companyLockEnabled,
      allowedCompanies,
      permissions: u.permissions,
    };

    await updateUserData(u.id, payload);

    setShowPermissionModal(false);
    setEditingPermissions(null);
  };


  const togglePermission = (module, perm) => {
    setEditingPermissions((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions?.[module],
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


  // ===========================================
  // CREATE USER
  // ===========================================
  const handleCreateUser = async () => {
    setCreateMsg("");

    const payload = {
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone,
      password: createForm.password,
      role: createForm.role,
      login_method: createForm.loginMethod,
      companyLockEnabled: createForm.companyLockEnabled,
      allowedCompanies: createForm.allowedCompanies || [],
    };

    setCreateLoading(true);
    const res = await createUser(payload);
    setCreateLoading(false);

    if (res.success) {
      setCreateMsg("User created successfully!");
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "user",
          loginMethod: "email",
          companyLockEnabled: false,
          allowedCompanies: [],
        });
      }, 1000);
    } else {
      setCreateMsg(res.message || "Failed to create user");
    }
  };


  // ===========================================
  // UI STARTS
  // ===========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] to-[#112240] p-6">
      <div className="max-w-7xl mx-auto space-y-6">


        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#64FFDA] flex items-center gap-3">
              <Users size={32} /> User Management
            </h1>
            <p className="text-gray-400 text-sm">Manage users and permissions</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] rounded-lg font-bold flex items-center gap-2"
          >
            <UserPlus size={18} />
            Create User
          </button>
        </div>



        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Total Users" value={stats.total} color="blue" icon={<Users size={20} />} />
          <StatCard title="Active" value={stats.active} color="green" icon={<CheckCircle size={20} />} />
          <StatCard title="Pending" value={stats.pending} color="yellow" icon={<Clock size={20} />} />
          <StatCard title="Admins" value={stats.admins} color="red" icon={<Crown size={20} />} />
          <StatCard title="MIS" value={stats.mis} color="purple" icon={<Shield size={20} />} />
          <StatCard title="Users" value={stats.regularUsers} color="cyan" icon={<Users size={20} />} />
        </div>


        {/* FILTERS */}
        <div className="bg-[#112240] p-4 rounded-xl border border-[#1E2D45] grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
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



        {/* USERS TABLE */}
        <div className="bg-[#112240] rounded-xl border border-[#1E2D45] overflow-hidden">
          <div className="overflow-x-auto">

            <table className="w-full">
              <thead className="bg-[#0A192F] border-b border-[#1E2D45]">
                <tr>
                  <Th>User</Th>
                  <Th>Contact</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Login</Th>
                  <Th>Company Access</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1E2D45]">

                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-500">No users found</td></tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#0A192F] transition">
                    {/* NAME */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] flex items-center justify-center font-bold">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.role}</div>
                        </div>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-4 py-3">
                      <div className="text-gray-300 text-sm">{u.email}</div>
                      <div className="text-gray-300 text-sm">{u.phone}</div>
                    </td>

                    {/* ROLE */}
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3">
                      {u.status === "active" ? (
                        <Tag green>Active</Tag>
                      ) : (
                        <Tag yellow>Pending</Tag>
                      )}
                    </td>

                    {/* LOGIN METHOD */}
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {u.loginMethod === "email" ? "Email/Password" : "Phone/OTP"}
                    </td>

                    {/* COMPANIES */}
                    <td className="px-4 py-3">
                      {!u.companyLockEnabled ? (
                        <span className="text-xs text-gray-500">All companies</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(u.allowedCompanies || []).map((c) => (
                            <span key={c} className="px-2 py-1 bg-[#0A192F] text-[#64FFDA] border border-[#1E2D45] text-xs rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">

                        <ActionBtn onClick={() => setSelectedUser(u)}>
                          <Eye size={16} />
                        </ActionBtn>

                        {u.status === "pending" && (
                          <ActionBtn green onClick={() => handleApprove(u.id)}>
                            <CheckCircle size={16} />
                          </ActionBtn>
                        )}

                        <ActionBtn onClick={() => handleEditPermissions(u)}>
                          <Settings size={16} />
                        </ActionBtn>

                        {currentUser.role === "admin" && u.id !== currentUser.id && (
                          <ActionBtn red onClick={() => handleDelete(u.id)}>
                            <Trash2 size={16} />
                          </ActionBtn>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}

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
            onClose={() => setShowPermissionModal(false)}
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
            onClose={() => setShowCreateModal(false)}
            msg={createMsg}
            loading={createLoading}
          />
        )}

      </div>
    </div>
  );
}



// ===========================================
// COMPONENTS 
// ===========================================

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
      {children}
    </th>
  );
}

function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        role === "admin"
          ? "bg-red-500/20 text-red-400"
          : role === "mis"
          ? "bg-blue-500/20 text-blue-400"
          : "bg-green-500/20 text-green-400"
      }`}
    >
      {role.toUpperCase()}
    </span>
  );
}

function Tag({ children, green, yellow }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        green
          ? "bg-green-500/20 text-green-400"
          : yellow
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-gray-500/20 text-gray-400"
      }`}
    >
      {children}
    </span>
  );
}

function ActionBtn({ children, onClick, green, red }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition ${
        green
          ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
          : red
          ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          : "bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]"
      }`}
    >
      {children}
    </button>
  );
}


function StatCard({ title, value, icon, color }) {
  const colorMap = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
    red: "from-red-500/20 to-red-600/20 border-red-500/30",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-gray-400 uppercase">{title}</div>
    </div>
  );
}



// ==========================
// USER DETAILS MODAL
// ==========================
function UserDetailsModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#112240] rounded-xl border border-[#1E2D45] max-w-2xl w-full max-h-[80vh] overflow-y-auto">

        <div className="flex items-center justify-between p-4 border-b border-[#1E2D45]">
          <h3 className="text-xl font-bold text-[#64FFDA]">User Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#0A192F] rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] text-3xl font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h4 className="font-bold text-white text-2xl mt-3">
              {user.name}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Detail label="Email" value={user.email} />
            <Detail label="Phone" value={user.phone} />
            <Detail label="Role" value={user.role} />
            <Detail label="Status" value={user.status} />
            <Detail
              label="Login Method"
              value={user.loginMethod === "email" ? "Email/Password" : "Phone/OTP"}
            />
            <Detail
              label="Company Access"
              value={
                user.companyLockEnabled
                  ? (user.allowedCompanies || []).join(", ")
                  : "All Companies"
              }
            />
          </div>

          <div className="bg-[#0A192F] p-4 rounded-lg border border-[#1E2D45]">
            <h5 className="text-white font-bold mb-3">Permissions</h5>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(user.permissions || {})
                .filter(([_, perms]) => Object.values(perms).some((p) => p))
                .map(([module, perms]) => (
                  <div key={module} className="bg-[#112240] p-2 rounded border border-[#1E2D45]">
                    <div className="text-[#64FFDA] font-semibold capitalize">
                      {module}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {Object.entries(perms)
                        .filter(([_, v]) => v)
                        .map(([k]) => k)
                        .join(", ")}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="bg-[#0A192F] p-3 rounded-lg border border-[#1E2D45]">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-white font-medium">{value || "—"}</div>
    </div>
  );
}



// =====================================
// PERMISSION EDITOR (FULL FINAL)
// =====================================
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

  const perms = ["view", "create", "edit", "delete", "export"];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#112240] rounded-xl border border-[#1E2D45] w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2D45]">
          <div>
            <h3 className="text-xl font-bold text-[#64FFDA]">
              Edit Permissions
            </h3>
            <p className="text-gray-400 text-sm">{user.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#0A192F] rounded-lg">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ROLE */}
          <div className="bg-[#0A192F] border border-[#1E2D45] p-4 rounded-lg">
            <label className="text-sm text-gray-400 mb-2 block">User Role</label>
            <select
              className="w-full bg-[#112240] border border-[#1E2D45] text-white px-4 py-2 rounded-lg"
              value={user.role}
              onChange={(e) =>
                setEditingPermissions((prev) => ({
                  ...prev,
                  role: e.target.value,
                }))
              }
            >
              <option value="user">User</option>
              <option value="mis">MIS</option>
              <option value="admin">Admin</option>
            </select>
          </div>


          {/* COMPANY LOCK */}
          <div className="bg-[#0A192F] border border-[#1E2D45] p-4 rounded-lg space-y-3">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Building size={18} /> Company Access
            </h4>

            <select
              className="bg-[#112240] border border-[#1E2D45] text-white px-4 py-2 rounded-lg"
              value={user.companyLockEnabled ? "true" : "false"}
              onChange={(e) =>
                setEditingPermissions((prev) => ({
                  ...prev,
                  companyLockEnabled: e.target.value === "true",
                }))
              }
            >
              <option value="false">Disabled (All Companies)</option>
              <option value="true">Enable Lock</option>
            </select>

            {user.companyLockEnabled && (
              <input
                type="text"
                placeholder="Samsung, Milton, Zebronics"
                className="w-full bg-[#112240] border border-[#1E2D45] text-white px-4 py-2 rounded-lg"
                value={user.allowedCompaniesText}
                onChange={(e) =>
                  setEditingPermissions((prev) => ({
                    ...prev,
                    allowedCompaniesText: e.target.value,
                  }))
                }
              />
            )}
          </div>



          {/* PERMISSION GRID */}
          <div className="space-y-4">
            {modules.map((m) => (
              <div key={m} className="bg-[#0A192F] border border-[#1E2D45] p-4 rounded-lg">

                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold capitalize">{m}</h4>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllModulePermissions(m, true)}
                      className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30"
                    >
                      ALL ON
                    </button>
                    <button
                      onClick={() => setAllModulePermissions(m, false)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30"
                    >
                      ALL OFF
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {perms.map((p) => (
                    <label key={p} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={user.permissions?.[m]?.[p] || false}
                        onChange={() => togglePermission(m, p)}
                        className="w-4 h-4 bg-[#112240] border-[#1E2D45] rounded"
                      />
                      <span className="text-sm text-gray-300 capitalize">{p}</span>
                    </label>
                  ))}
                </div>

              </div>
            ))}
          </div>



          {/* SAVE BUTTON */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#0A192F] text-white rounded-lg hover:bg-[#1E2D45]"
            >
              Cancel
            </button>

            <button
              onClick={onSave}
              className="px-6 py-2 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] font-bold rounded-lg"
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
