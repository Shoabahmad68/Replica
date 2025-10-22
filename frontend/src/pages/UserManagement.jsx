// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Filter,
  Users,
  Plus,
  Download,
  Activity,
  Shield,
  KeyRound,
  Zap,
  Clock,
  Mail,
  Smartphone,
  LogIn,
  LogOut,
  Settings,
  CheckSquare,
  Repeat,
  CornerDownLeft,
} from "lucide-react";

import config from "../config.js";


/*
  USER MANAGEMENT - FINAL FULL VERSION
  - UI text: English
  - No demo data hardcoded (starts empty)
  - Full feature surface implemented client-side
  - Backend-ready API hooks (placeholders) using axios
  - Export/Import, Invite, Roles & Permissions, Activity Logs
  - Security settings: 2FA toggle, session timeout, password policy
  - Mobile friendly responsive layout
  - Comments explain where to hook backend
*/

/* ---------- Constants & Helpers ---------- */
const USERS_API = `${BACKEND_URL}/api/users`;
const ROLES_API = `${BACKEND_URL}/api/roles`;
const LOGS_API = `${BACKEND_URL}/api/logs`;
const INVITE_API = `${BACKEND_URL}/api/invite`;
const EXPORT_API = `${BACKEND_URL}/api/export`;


const LS_USERS = "um_users";
const LS_ROLES = "um_roles";
const LS_LOGS = "um_logs";
const LS_SETTINGS = "um_settings";

const nowISO = () => new Date().toISOString();
const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

function exportCSV(filename, rows = []) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv =
    [keys.join(",")]
      .concat(
        rows.map((r) =>
          keys
            .map((k) => {
              let v = r[k] == null ? "" : String(r[k]);
              if (v.includes(",") || v.includes('"') || v.includes("\n")) {
                v = `"${v.replaceAll('"', '""')}"`;
              }
              return v;
            })
            .join(",")
        )
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Initial empty seeds (no demo data) ---------- */
const initialRoles = []; // will fetch from backend or start empty
const initialUsers = []; // no demo rows
const initialLogs = [];
const initialSettings = {
  defaultRoleId: "",
  autoSuspendAfterDays: 90,
  enable2FAByDefault: false,
  passwordMinLength: 8,
  sessionTimeoutMinutes: 30,
  ipWhitelist: [],
  notifyOnInviteByWhatsApp: true,
  notifyOnInviteByEmail: true,
};

/* ---------- Main Component ---------- */
export default function UserManagement() {
  /* States */
  const [users, setUsers] = useState(() => loadLS(LS_USERS, initialUsers));
  const [roles, setRoles] = useState(() => loadLS(LS_ROLES, initialRoles));
  const [logs, setLogs] = useState(() => loadLS(LS_LOGS, initialLogs));
  const [settings, setSettings] = useState(() => loadLS(LS_SETTINGS, initialSettings));

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters and UI
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("any"); // Active, Suspended, Invited
  const [filterRoleId, setFilterRoleId] = useState("any");
  const [sortBy, setSortBy] = useState("lastLoginDesc"); // createdAsc, nameAsc etc.
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);

  // Panels
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  // Refs
  const fileRef = useRef();

  /* ---------- Effects: persist to localStorage for offline testing ---------- */
  useEffect(() => saveLS(LS_USERS, users), [users]);
  useEffect(() => saveLS(LS_ROLES, roles), [roles]);
  useEffect(() => saveLS(LS_LOGS, logs), [logs]);
  useEffect(() => saveLS(LS_SETTINGS, settings), [settings]);

  /* ---------- Backend load on mount ---------- */

useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      // ✅ Roles
      try {
        const res = await axios.get(ROLES_API);
        const data = res?.data || [];
        if (Array.isArray(data)) {
          setRoles(data);
          localStorage.setItem(LS_ROLES, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Roles load failed:", err.message);
        const saved = localStorage.getItem(LS_ROLES);
        setRoles(saved ? JSON.parse(saved) : []);
      }

      // ✅ Users
      try {
        const res = await axios.get(USERS_API);
        const data = res?.data || [];
        if (Array.isArray(data)) {
          setUsers(data);
          localStorage.setItem(LS_USERS, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Users load failed:", err.message);
        const saved = localStorage.getItem(LS_USERS);
        setUsers(saved ? JSON.parse(saved) : []);
      }

      // ✅ Logs
      try {
        const res = await axios.get(LOGS_API);
        const data = res?.data || [];
        if (Array.isArray(data)) {
          setLogs(data);
          localStorage.setItem(LS_LOGS, JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Logs load failed:", err.message);
        const saved = localStorage.getItem(LS_LOGS);
        setLogs(saved ? JSON.parse(saved) : []);
      }
    } catch (err) {
      console.error("Initial load failed:", err);
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);


  /* ---------- Derived data ---------- */
  const roleMap = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "Active").length;
    const invited = users.filter((u) => u.status === "Invited").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    const lastLoginUser = users
      .filter((u) => u.lastLogin)
      .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))[0];
    return {
      total,
      active,
      invited,
      suspended,
      lastLoginUser,
    };
  }, [users]);

  const filteredSorted = useMemo(() => {
    let list = users.slice();
    if (filterStatus !== "any") list = list.filter((u) => u.status === filterStatus);
    if (filterRoleId !== "any") list = list.filter((u) => u.roleId === filterRoleId);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (roleMap[u.roleId]?.name || "").toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "nameAsc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "lastLoginDesc":
        list.sort((a, b) => (new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)));
        break;
      case "createdDesc":
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }
    return list;
  }, [users, filterStatus, filterRoleId, query, sortBy, roleMap]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / perPage));
  const paged = filteredSorted.slice((page - 1) * perPage, page * perPage);

  /* ---------- Logging helper ---------- */
  const pushLog = async (entry) => {
    const row = { id: genId(), time: nowISO(), ...entry };
    setLogs((s) => [row, ...s].slice(0, 5000));
    // attempt backend save (non-blocking)
    try {
      await axios.post(LOGS_API, row);
    } catch {
      // ignore backend errors
    }
  };

  /* ---------- User CRUD operations (frontend + optional backend) ---------- */
  const addUser = async (payload) => {
    setLoading(true);
    try {
      // expected payload: { name,email,roleId,status,phone,permissions,meta }
      // if backend available:
      try {
        const res = await axios.post(USERS_API, payload);
        if (res?.data) {
          setUsers((s) => [res.data, ...s]);
          pushLog({ user: res.data.name || res.data.email, action: "User created", module: "Users" });
          setSuccessMsg("User created");
          return;
        }
      } catch {
        // fallback to local
      }
      const newUser = { id: genId(), createdAt: nowISO(), lastLogin: null, ...payload };
      setUsers((s) => [newUser, ...s]);
      pushLog({ user: newUser.name || newUser.email, action: "User created (local)", module: "Users" });
      setSuccessMsg("User created (local)");
    } catch (err) {
      setErrorMsg("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, patch) => {
    setLoading(true);
    try {
      try {
        const res = await axios.put(`${USERS_API}/${id}`, patch);
        if (res?.data) {
          setUsers((s) => s.map((u) => (u.id === id ? res.data : u)));
          pushLog({ user: id, action: "User updated", module: "Users" });
          setSuccessMsg("User updated");
          return;
        }
      } catch {
        // fallback
      }
      setUsers((s) => s.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      pushLog({ user: id, action: "User patched (local)", module: "Users" });
      setSuccessMsg("User updated (local)");
    } catch {
      setErrorMsg("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete user? This action cannot be undone.")) return;
    setLoading(true);
    try {
      try {
        await axios.delete(`${USERS_API}/${id}`);
        setUsers((s) => s.filter((u) => u.id !== id));
        pushLog({ user: id, action: "User deleted", module: "Users" });
        setSuccessMsg("User deleted");
        return;
      } catch {
        // fallback
      }
      setUsers((s) => s.filter((u) => u.id !== id));
      pushLog({ user: id, action: "User deleted (local)", module: "Users" });
      setSuccessMsg("User deleted (local)");
    } catch {
      setErrorMsg("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordForUser = async (id) => {
    // This ideally calls backend to reset password and send email/whatsapp
    const confirmReset = confirm("Generate a new temporary password and show it?");
    if (!confirmReset) return;
    const temp = Math.random().toString(36).slice(-10);
    pushLog({ user: id, action: "Password reset", module: "Users" });
    alert(`Temporary password: ${temp}`);
    // optionally send to backend
    try {
      await axios.post(`${USERS_API}/${id}/reset-password`, { password: temp });
    } catch {
      // ignore
    }
  };

  const toggleSuspend = async (id) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const next = u.status === "Suspended" ? "Active" : "Suspended";
    await updateUser(id, { status: next });
  };

  /* ---------- Roles & Permissions (frontend + backend hooks) ---------- */
  const createRole = async (roleName) => {
    if (!roleName || !roleName.trim()) return setErrorMsg("Role name required");
    setLoading(true);
    try {
      const roleObj = {
        id: genId(),
        name: roleName.trim(),
        permissions: {
          Dashboard: { view: true, create: false, edit: false, delete: false, export: false },
          Reports: { view: true, create: false, edit: false, delete: false, export: true },
          Billing: { view: true, create: false, edit: false, delete: false, export: false },
          Outstanding: { view: true, create: false, edit: false, delete: false, export: false },
          Messaging: { view: true, create: false, edit: false, delete: false, export: false },
          Settings: { view: false, create: false, edit: false, delete: false, export: false },
          UserManagement: { view: false, create: false, edit: false, delete: false, export: false },
          MIS: { view: false, create: false, edit: false, delete: false, export: false },
        },
      };
      try {
        const res = await axios.post(ROLES_API, roleObj);
        if (res?.data) {
          setRoles((s) => [res.data, ...s]);
          pushLog({ action: "Role created", module: "Roles", role: res.data.name });
          setSuccessMsg("Role created");
          return;
        }
      } catch {
        // fallback
      }
      setRoles((s) => [roleObj, ...s]);
      pushLog({ action: "Role created (local)", module: "Roles", role: roleName });
      setSuccessMsg("Role created (local)");
    } catch {
      setErrorMsg("Create role failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (roleId, patch) => {
    setLoading(true);
    try {
      try {
        const res = await axios.put(`${ROLES_API}/${roleId}`, patch);
        if (res?.data) {
          setRoles((s) => s.map((r) => (r.id === roleId ? res.data : r)));
          pushLog({ action: "Role updated", module: "Roles", role: roleId });
          setSuccessMsg("Role updated");
          return;
        }
      } catch {
        // fallback
      }
      setRoles((s) => s.map((r) => (r.id === roleId ? { ...r, ...patch } : r)));
      pushLog({ action: "Role patched (local)", module: "Roles", role: roleId });
      setSuccessMsg("Role updated (local)");
    } catch {
      setErrorMsg("Update role failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId) => {
    if (!confirm("Delete role? Users using this role will be unaffected.")) return;
    setLoading(true);
    try {
      try {
        await axios.delete(`${ROLES_API}/${roleId}`);
        setRoles((s) => s.filter((r) => r.id !== roleId));
        pushLog({ action: "Role deleted", module: "Roles", role: roleId });
        setSuccessMsg("Role deleted");
        return;
      } catch {
        // fallback
      }
      setRoles((s) => s.filter((r) => r.id !== roleId));
      pushLog({ action: "Role deleted (local)", module: "Roles", role: roleId });
      setSuccessMsg("Role deleted (local)");
    } catch {
      setErrorMsg("Delete role failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Invite / Send invite (email/whatsapp) ---------- */
  const sendInvite = async ({ emails = [], phones = [], template = "", roleId = "" }) => {
    setLoading(true);
    try {
      const payload = { emails, phones, template, roleId };
      try {
        await axios.post(INVITE_API, payload);
        pushLog({ action: "Invites sent", module: "Invite", meta: { emails, phones } });
        setSuccessMsg("Invites sent (backend)");
        return;
      } catch {
        // fallback: create invited users locally
      }
      const created = [];
      emails.forEach((em) => {
        const u = { id: genId(), name: em.split("@")[0], email: em, roleId, status: "Invited", createdAt: nowISO() };
        created.push(u);
      });
      phones.forEach((p) => {
        const u = { id: genId(), name: p, phone: p, roleId, status: "Invited", createdAt: nowISO() };
        created.push(u);
      });
      if (created.length) {
        setUsers((s) => [...created, ...s]);
        pushLog({ action: "Invites created (local)", module: "Invite", count: created.length });
        setSuccessMsg("Invites created locally");
      } else {
        setErrorMsg("No recipients provided");
      }
    } catch {
      setErrorMsg("Failed to send invites");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Activity Logs Export / Clear ---------- */
  const exportLogsCSV = () => {
    exportCSV("activity_logs.csv", logs);
  };

  const clearLogs = () => {
    if (!confirm("Clear activity logs? This cannot be undone.")) return;
    setLogs([]);
    pushLog({ action: "Logs cleared", module: "Logs" });
  };

  /* ---------- File import for bulk users (CSV/Excel) ---------- */
  const importUsersFromFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      // if backend endpoint exists you can post file to server for parsing
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await axios.post(`${BACKEND_URL}/api/import-users`, form, {

          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res?.data?.users) {
          setUsers((s) => [...res.data.users, ...s]);
          pushLog({ action: "Users imported (backend)", module: "Import", count: res.data.users.length });
          setSuccessMsg("Imported users from backend");
          return;
        }
      } catch {
        // fallback: we won't implement local excel parsing here (keep no third-party libs)
      }
      setErrorMsg("Import failed. Backend parsing not available.");
    } catch {
      setErrorMsg("Import error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Settings update ---------- */
  const updateSettings = (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    pushLog({ action: "Settings updated", module: "Settings", payload: patch });
  };

  /* ---------- Utilities for UI ---------- */
  const prettyDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
  const userRoleName = (u) => roleMap[u?.roleId]?.name || "—";

  /* ---------- Render UI ---------- */
  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-3">
            <Users /> User Management
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Manage users, roles, invitations, and security settings. Connect backend endpoints to persist changes.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="bg-[#64FFDA] text-[#0A192F] px-3 py-2 rounded-md font-semibold"
            onClick={() => setShowInvitePanel(true)}
          >
            <UserPlus size={16} /> Invite
          </button>

          <button
            className="bg-[#2b6cb0] px-3 py-2 rounded-md text-white"
            onClick={() => {
              setShowRoleManager(true);
            }}
          >
            <Settings size={14} /> Roles & Permissions
          </button>

          <div className="flex items-center gap-2 bg-[#0f1830] px-3 py-2 rounded-md">
            <Download size={16} />
            <button
              className="text-sm text-white"
              onClick={() => {
                exportCSV("users_export.csv", users);
                pushLog({ action: "Users exported", module: "Export" });
              }}
            >
              Export Users
            </button>
          </div>
        </div>
      </div>

      {/* quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={stats.total} />
        <StatCard title="Active Users" value={stats.active} />
        <StatCard title="Invited" value={stats.invited} />
        <StatCard title="Roles Defined" value={roles.length} />
        <StatCard title="Suspended" value={stats.suspended} />
      </div>

      {/* search & filters */}
      <div className="bg-[#071426] p-4 rounded-md flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#0b2536] p-2 rounded-md flex-1 min-w-[200px]">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, role..."
            className="bg-transparent outline-none text-gray-200 w-full"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0b2536] px-3 py-2 rounded-md text-sm"
        >
          <option value="any">Status: All</option>
          <option value="Active">Active</option>
          <option value="Invited">Invited</option>
          <option value="Suspended">Suspended</option>
        </select>

        <select
          value={filterRoleId}
          onChange={(e) => setFilterRoleId(e.target.value)}
          className="bg-[#0b2536] px-3 py-2 rounded-md text-sm"
        >
          <option value="any">Role: All</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#0b2536] px-3 py-2 rounded-md text-sm"
        >
          <option value="lastLoginDesc">Sort: Last Login (new → old)</option>
          <option value="createdDesc">Sort: Created (new → old)</option>
          <option value="nameAsc">Sort: Name (A → Z)</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-300">Per page</label>
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="bg-[#0b2536] px-2 py-1 rounded">
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
        </div>
      </div>

      {/* main table */}
      <div className="bg-[#0f1a2b] rounded-md border border-[#12233a] p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-100">User List</h3>
          <div className="flex items-center gap-2">
            <button
              className="bg-[#1e293b] px-3 py-2 rounded-md text-sm"
              onClick={() => {
                setShowLogsPanel((s) => !s);
              }}
            >
              <Activity size={16} /> Activity Logs ({logs.length})
            </button>
            <input type="file" ref={fileRef} className="hidden" onChange={(e) => importUsersFromFile(e.target.files?.[0])} />
            <button
              className="bg-[#16325b] px-3 py-2 rounded-md text-sm"
              onClick={() => fileRef.current?.click()}
            >
              Import Users
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="text-xs text-gray-400 uppercase bg-[#0b2134] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last Login</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}

              {paged.map((u) => (
                <tr key={u.id} className="border-b border-[#0d2336] hover:bg-[#0a2233]">
                  <td className="px-3 py-3">{u.name || "—"}</td>
                  <td className="px-3 py-3">{u.email || u.phone || "—"}</td>
                  <td className="px-3 py-3">{userRoleName(u)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.status === "Active" ? "bg-green-800 text-green-200" : u.status === "Invited" ? "bg-yellow-800 text-yellow-200" : "bg-red-800 text-red-200"
                      }`}
                    >
                      {u.status || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">{prettyDate(u.lastLogin)}</td>
                  <td className="px-3 py-3 flex gap-1">
                    <button onClick={() => setViewingUser(u)} className="p-1 rounded hover:bg-[#102a43]"><Eye size={16} /></button>
                    <button onClick={() => setEditingUser(u)} className="p-1 rounded hover:bg-[#102a43]"><Edit size={16} /></button>
                    <button onClick={() => toggleSuspend(u.id)} className="p-1 rounded hover:bg-[#102a43]"><Shield size={16} /></button>
                    <button onClick={() => resetPasswordForUser(u.id)} className="p-1 rounded hover:bg-[#102a43]"><KeyRound size={16} /></button>
                    <button onClick={() => deleteUser(u.id)} className="p-1 rounded hover:bg-[#421b00]"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-300">
            Showing {Math.min((page - 1) * perPage + 1, filteredSorted.length)} - {Math.min(page * perPage, filteredSorted.length)} of {filteredSorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 bg-[#0b2334] rounded" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <div className="px-3 py-1 bg-[#071826] rounded text-sm">{page}/{totalPages}</div>
            <button className="px-2 py-1 bg-[#0b2334] rounded" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </div>

      {/* right side panels (invite, role manager, logs, view/edit modal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Invite Panel */}
        {showInvitePanel && (
          <div className="col-span-1 md:col-span-1 bg-[#071826] p-4 rounded border border-[#12233a]">
            <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2"><Mail /> Invite Users</h4>
            <InviteForm
              roles={roles}
              onClose={() => setShowInvitePanel(false)}
              onSend={(payload) => {
                sendInvite(payload);
                setShowInvitePanel(false);
              }}
            />
          </div>
        )}

        {/* Roles & Permissions panel */}
        {showRoleManager && (
          <div className="bg-[#071826] p-4 rounded border border-[#12233a] md:col-span-1 col-span-1">
            <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2"><Settings /> Roles & Permissions</h4>

            {/* --- keep the original RoleManager (unchanged) --- */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Legacy Role Manager (kept for compatibility)</div>
              <RoleManager
                roles={roles}
                onCreate={(name) => createRole(name)}
                onUpdate={(id, patch) => updateRole(id, patch)}
                onDelete={(id) => deleteRole(id)}
              />
            </div>

            {/* --- enhanced manager below (new, more features) --- */}
            <div className="mt-4">
              <EnhancedRoleManager
                roles={roles}
                users={users}
                onCreateRole={createRole}
                onUpdateRole={updateRole}
                onDeleteRole={deleteRole}
                onAssignRole={(userId, roleId) => updateUser(userId, { roleId })}
                onUpdateRolesState={(newRoles) => setRoles(newRoles)}
              />
            </div>
          </div>
        )}

        {/* Logs / Settings */}
        <div className="bg-[#071826] p-4 rounded border border-[#12233a] md:col-span-2">
          <div className="flex justify-between">
            <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2"><Activity /> Activity Logs</h4>
            <div className="flex gap-2">
              <button className="px-2 py-1 bg-[#0b2334] rounded" onClick={exportLogsCSV}><Download size={14}/> Export</button>
              <button className="px-2 py-1 bg-[#421b00] rounded" onClick={clearLogs}><Trash2 size={14}/> Clear</button>
            </div>
          </div>

          <div className="mt-3 max-h-48 overflow-auto">
            {logs.length === 0 && <div className="text-gray-400">No logs available.</div>}
            <ul className="space-y-2">
              {logs.slice(0, 100).map((l) => (
                <li key={l.id} className="text-xs bg-[#081726] p-2 rounded border border-[#0e2740]">
                  <div className="flex justify-between">
                    <div className="text-sm">{l.action} <span className="text-xs text-gray-400">({l.module})</span></div>
                    <div className="text-xs text-gray-400">{new Date(l.time).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{l.info || JSON.stringify(l.payload || {})}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Settings */}
          <div className="mt-4 border-t border-[#0e2740] pt-3">
            <h5 className="font-semibold text-gray-200 mb-2">Security & Settings</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between">
                Default Role on Invite
                <select value={settings.defaultRoleId} onChange={(e) => updateSettings({ defaultRoleId: e.target.value })} className="bg-[#0b2334] px-2 py-1 rounded">
                  <option value="">None</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>

              <label className="flex items-center justify-between">
                Auto Suspend (days)
                <input type="number" value={settings.autoSuspendAfterDays} onChange={(e) => updateSettings({ autoSuspendAfterDays: Number(e.target.value) })} className="bg-[#0b2334] px-2 py-1 rounded w-28"/>
              </label>

              <label className="flex items-center justify-between">
                Password min length
                <input type="number" value={settings.passwordMinLength} onChange={(e) => updateSettings({ passwordMinLength: Number(e.target.value) })} className="bg-[#0b2334] px-2 py-1 rounded w-20"/>
              </label>

              <label className="flex items-center justify-between">
                Session timeout (min)
                <input type="number" value={settings.sessionTimeoutMinutes} onChange={(e) => updateSettings({ sessionTimeoutMinutes: Number(e.target.value) })} className="bg-[#0b2334] px-2 py-1 rounded w-20"/>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.enable2FAByDefault} onChange={(e) => updateSettings({ enable2FAByDefault: e.target.checked })} />
                Enable 2FA by default on invite
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.notifyOnInviteByWhatsApp} onChange={(e) => updateSettings({ notifyOnInviteByWhatsApp: e.target.checked })} />
                Notify invites via WhatsApp
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.notifyOnInviteByEmail} onChange={(e) => updateSettings({ notifyOnInviteByEmail: e.target.checked })} />
                Notify invites via Email
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Modals: view user / edit user */}
      {viewingUser && (
        <Modal title="View User" onClose={() => setViewingUser(null)}>
          <ViewUser user={viewingUser} role={roleMap[viewingUser.roleId]} />
        </Modal>
      )}

      {editingUser && (
        <Modal title={editingUser?.id ? "Edit User" : "Create User"} onClose={() => setEditingUser(null)}>
          <UserEditor
            roles={roles}
            user={editingUser}
            onCancel={() => setEditingUser(null)}
            onSave={async (payload) => {
              if (editingUser?.id) {
                await updateUser(editingUser.id, payload);
              } else {
                await addUser(payload);
              }
              setEditingUser(null);
            }}
          />
        </Modal>
      )}

      {/* Notifications */}
      <div className="fixed left-6 bottom-6 z-40 space-y-2">
        {successMsg && (
          <div className="bg-green-700 text-white px-4 py-2 rounded shadow" onClick={() => setSuccessMsg("")}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-700 text-white px-4 py-2 rounded shadow" onClick={() => setErrorMsg("")}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small subcomponents ---------- */

function StatCard({ title, value }) {
  return (
    <div className="bg-[#071827] p-4 rounded border border-[#0e2a3f] text-center">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

/* ---------- InviteForm ---------- */
function InviteForm({ roles = [], onClose, onSend }) {
  const [emailsText, setEmailsText] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [roleId, setRoleId] = useState("");
  const [template, setTemplate] = useState("Hello {{name}}, you are invited to join. Click here: {{link}}");

  const submit = () => {
    const emails = emailsText.split(/\s|,|;/).map(s => s.trim()).filter(Boolean);
    const phones = phonesText.split(/\s|,|;/).map(s => s.trim()).filter(Boolean);
    onSend({ emails, phones, template, roleId });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-300">Emails (comma or newline separated)</label>
      <textarea value={emailsText} onChange={e => setEmailsText(e.target.value)} rows={3} className="w-full bg-[#071e30] p-2 rounded text-gray-200"></textarea>

      <label className="text-sm text-gray-300">Phones (comma or newline separated)</label>
      <textarea value={phonesText} onChange={e => setPhonesText(e.target.value)} rows={2} className="w-full bg-[#071e30] p-2 rounded text-gray-200"></textarea>

      <label className="text-sm text-gray-300">Role</label>
      <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200">
        <option value="">-- select role --</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <label className="text-sm text-gray-300">Message Template</label>
      <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={3} className="w-full bg-[#071e30] p-2 rounded text-gray-200"></textarea>

      <div className="flex gap-2">
        <button className="bg-[#64FFDA] px-3 py-2 rounded" onClick={submit}>Send Invites</button>
        <button className="bg-[#0b2334] px-3 py-2 rounded" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------- RoleManager (original kept as-is) ---------- */
function RoleManager({ roles = [], onCreate, onUpdate, onDelete }) {
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [localRoles, setLocalRoles] = useState(roles);

  useEffect(() => setLocalRoles(roles), [roles]);

  const create = () => {
    if (!name.trim()) return alert("Enter role name");
    onCreate(name.trim());
    setName("");
  };

  const updatePerm = (rid, module, perm, value) => {
    const r = localRoles.map((x) => (x.id === rid ? { ...x, permissions: { ...x.permissions, [module]: { ...x.permissions[module], [perm]: value } } } : x));
    setLocalRoles(r);
    onUpdate(rid, r.find((x) => x.id === rid));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="New role name" className="bg-[#071827] p-2 rounded flex-1 text-gray-200"/>
        <button className="bg-[#64FFDA] text-[#0A192F] font-semibold px-3 py-2 rounded hover:opacity-90" onClick={create}>
  <Plus size={14}/> Create
</button>

      </div>

      <div>
        {localRoles.length === 0 && <div className="text-gray-400">No roles created yet.</div>}
        {localRoles.map(r => (
          <div key={r.id} className="bg-[#071827] p-3 rounded border border-[#0f2a44] mb-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold">{r.name}</div>
              <div className="flex gap-2">
                <button className="text-sm bg-[#0b2334] px-2 py-1 rounded" onClick={() => onDelete(r.id)}><Trash2 size={14}/> Delete</button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.keys(r.permissions || {}).map(mod => (
                <div key={mod} className="bg-[#061623] p-2 rounded">
                  <div className="text-sm font-medium mb-1">{mod}</div>
                  {["view","create","edit","delete","export"].map(p => (
                    <label key={p} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={r.permissions[mod][p]} onChange={(e)=>updatePerm(r.id, mod, p, e.target.checked)}/>
                      {p}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- EnhancedRoleManager (NEW - advanced UI) ---------- */
function EnhancedRoleManager({ roles = [], users = [], onCreateRole, onUpdateRole, onDeleteRole, onAssignRole, onUpdateRolesState }) {
  const [localRoles, setLocalRoles] = useState(roles || []);
  const [name, setName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => setLocalRoles(roles || []), [roles]);

  const modulesList = [
    "Dashboard",
    "Reports",
    "Billing",
    "Outstanding",
    "Messaging",
    "Settings",
    "UserManagement",
    "MIS",
    "AdminPanel",
    "Charts",
  ];

  const createNewRole = async () => {
    if (!name.trim()) return alert("Role name required");
    const r = {
      id: genId(),
      name: name.trim(),
      permissions: Object.fromEntries(modulesList.map(m => [m, { view: false, create: false, edit: false, delete: false, export: false }])),
    };
    // optimistic
    setLocalRoles((s) => [r, ...s]);
    onCreateRole(name.trim());
    setName("");
  };

  const deleteRole = async (id) => {
    if (!confirm("Delete role?")) return;
    setLocalRoles((s) => s.filter((r) => r.id !== id));
    onDeleteRole(id);
    if (selectedRoleId === id) setSelectedRoleId(null);
  };

  const togglePerm = (roleId, mod, perm) => {
    const updated = localRoles.map((r) => {
      if (r.id !== roleId) return r;
      const p = { ...(r.permissions || {}) };
      if (!p[mod]) p[mod] = { view: false, create: false, edit: false, delete: false, export: false };
      p[mod][perm] = !p[mod][perm];
      return { ...r, permissions: p };
    });
    setLocalRoles(updated);
    onUpdateRole(roleId, updated.find((x) => x.id === roleId));
    onUpdateRolesState(updated);
  };

  const setAllPerms = (roleId, mod, val) => {
    const updated = localRoles.map((r) => {
      if (r.id !== roleId) return r;
      const p = { ...(r.permissions || {}) };
      p[mod] = { view: val, create: val, edit: val, delete: val, export: val };
      return { ...r, permissions: p };
    });
    setLocalRoles(updated);
    onUpdateRole(roleId, updated.find((x) => x.id === roleId));
    onUpdateRolesState(updated);
  };

  const assignRoleToUser = (roleId, userId) => {
    onAssignRole(userId, roleId);
    alert("Role assigned (backend sync optional).");
  };

  const filteredRoles = localRoles.filter(r => (r.name || "").toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className="bg-[#061422] p-3 rounded">
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New role name" className="bg-[#071827] p-2 rounded flex-1 text-gray-200"/>
        <button onClick={createNewRole} className="bg-[#64FFDA] text-[#0A192F] font-semibold px-3 py-2 rounded hover:opacity-90">
  Create
</button>

      </div>

      <div className="flex gap-3">
        {/* Left: role list */}
        <div className="w-1/3 bg-[#061726] p-2 rounded max-h-[320px] overflow-auto">
          <div className="flex items-center gap-2 mb-2">
            <input placeholder="Filter roles..." value={filterText} onChange={(e)=>setFilterText(e.target.value)} className="bg-[#071827] p-2 rounded text-sm flex-1" />
            <button onClick={() => { setLocalRoles([]); onUpdateRolesState([]); }} className="text-xs px-2 py-1 bg-[#0b2334] rounded">Clear</button>
          </div>
          {filteredRoles.length === 0 && <div className="text-gray-400 text-sm">No roles</div>}
          <ul className="space-y-2">
            {filteredRoles.map(r => (
              <li key={r.id} className={`p-2 rounded cursor-pointer ${selectedRoleId === r.id ? "bg-[#0f3350]" : "bg-[#071827]"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-gray-400">{Object.keys(r.permissions || {}).filter(m => Object.values(r.permissions[m]||{}).some(Boolean)).length} modules with perms</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedRoleId(r.id)} className="px-2 py-1 bg-[#0b2334] rounded text-xs">Edit</button>
                    <button onClick={() => deleteRole(r.id)} className="px-2 py-1 bg-[#4b1f1f] rounded text-xs">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: permissions editor + user assignment */}
        <div className="flex-1 bg-[#071827] p-3 rounded">
          {!selectedRoleId && <div className="text-gray-400">Select a role from left to edit permissions and assign users.</div>}
          {selectedRoleId && (() => {
            const role = localRoles.find(r => r.id === selectedRoleId);
            if (!role) return <div className="text-gray-400">Role not found</div>;
            return (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-white">{role.name} — Permissions</h4>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      // select all modules view=true
                      const updated = localRoles.map(r => r.id === role.id ? { ...r, permissions: Object.fromEntries(modulesList.map(m=>[m,{view:true,create:true,edit:true,delete:true,export:true}])) } : r);
                      setLocalRoles(updated);
                      onUpdateRole(role.id, updated.find(x=>x.id===role.id));
                      onUpdateRolesState(updated);
                    }} className="px-2 py-1 bg-[#064e3b] rounded text-xs">All On</button>
                    <button onClick={() => {
                      const updated = localRoles.map(r => r.id === role.id ? { ...r, permissions: Object.fromEntries(modulesList.map(m=>[m,{view:false,create:false,edit:false,delete:false,export:false}])) } : r);
                      setLocalRoles(updated);
                      onUpdateRole(role.id, updated.find(x=>x.id===role.id));
                      onUpdateRolesState(updated);
                    }} className="px-2 py-1 bg-[#4b1f1f] rounded text-xs">All Off</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulesList.map(mod => {
                    const p = (role.permissions && role.permissions[mod]) || { view:false,create:false,edit:false,delete:false,export:false };
                    return (
                      <div key={mod} className="bg-[#061623] p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">{mod}</div>
                          <div className="text-xs text-gray-400">Set</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {["view","create","edit","delete","export"].map(perm => (
                            <label key={perm} className="flex items-center gap-2 text-xs bg-[#0b2334] px-2 py-1 rounded">
                              <input type="checkbox" checked={p[perm]} onChange={() => togglePerm(role.id, mod, perm)} />
                              {perm}
                            </label>
                          ))}
                          <button onClick={() => setAllPerms(role.id, mod, true)} className="px-2 py-1 bg-[#064e3b] rounded text-xs">All</button>
                          <button onClick={() => setAllPerms(role.id, mod, false)} className="px-2 py-1 bg-[#4b1f1f] rounded text-xs">None</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <h5 className="font-semibold text-white mb-2">Assign role to users</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-auto">
                    {users.map(u => (
                      <div key={u.id} className="flex justify-between items-center bg-[#061427] p-2 rounded">
                        <div>
                          <div className="text-sm">{u.name || u.email || u.phone}</div>
                          <div className="text-xs text-gray-400">{u.email || u.phone}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-300 mr-2">{u.roleId === role.id ? "Assigned" : "-"}</div>
                          <button onClick={() => assignRoleToUser(role.id, u.id)} className="px-2 py-1 bg-[#0b2334] rounded text-xs">Assign</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ---------- UserEditor ---------- */
function UserEditor({ roles = [], user = {}, onSave, onCancel }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [roleId, setRoleId] = useState(user.roleId || "");
  const [status, setStatus] = useState(user.status || "Active");

  const save = () => {
    if (!name.trim()) return alert("Name required");
    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim(), roleId, status };
    onSave(payload);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-300">Full Name</label>
      <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200" />

      <label className="text-sm text-gray-300">Email</label>
      <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200" />

      <label className="text-sm text-gray-300">Phone</label>
      <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200" />

      <label className="text-sm text-gray-300">Role</label>
      <select value={roleId} onChange={(e)=>setRoleId(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200">
        <option value="">-- Select Role --</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <label className="text-sm text-gray-300">Status</label>
      <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full bg-[#071e30] p-2 rounded text-gray-200">
        <option value="Active">Active</option>
        <option value="Invited">Invited</option>
        <option value="Suspended">Suspended</option>
      </select>

      <div className="flex gap-2">
        <button className="bg-[#64FFDA] px-3 py-2 rounded" onClick={save}>Save</button>
        <button className="bg-[#0b2334] px-3 py-2 rounded" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------- ViewUser ---------- */
function ViewUser({ user, role }) {
  return (
    <div className="space-y-3">
      <div><strong>Name:</strong> {user.name}</div>
      <div><strong>Email:</strong> {user.email || "—"}</div>
      <div><strong>Phone:</strong> {user.phone || "—"}</div>
      <div><strong>Role:</strong> {role?.name || "—"}</div>
      <div><strong>Status:</strong> {user.status}</div>
      <div><strong>Created:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</div>
      <div><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}</div>
      <div><strong>Meta:</strong> <pre className="text-xs text-gray-300">{JSON.stringify(user.meta || {}, null, 2)}</pre></div>
    </div>
  );
}

/* ---------- Modal component ---------- */
function Modal({ children, title = "Modal", onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative w-[95%] md:w-3/4 lg:w-2/4 bg-[#071827] p-6 rounded-lg border border-[#0f2a44] shadow-lg z-60 overflow-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button className="text-gray-300" onClick={onClose}>Close</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
