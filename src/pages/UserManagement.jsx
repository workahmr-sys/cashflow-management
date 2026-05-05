import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "encoder" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser() {
    if (!form.full_name || !form.email || !form.password || !form.role) {
      setError("All fields are required"); return;
    }
    setCreating(true); setError("");
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name: form.full_name, role: form.role },
      });
      if (error) throw error;
      setShowCreate(false);
      setForm({ full_name: "", email: "", password: "", role: "encoder" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user) {
    await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
    load();
  }

  async function changeRole(userId, newRole) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    load();
  }

  const roleBadge = { admin: "#ef4444", encoder: "#f59e0b", viewer: "#6b7280" };

  return (
    <div className="page">
      <div className="page-header">
        <h2>User Management</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>➕ Add User</button>
      </div>

      {showCreate && (
        <div className="form-card" style={{ marginBottom: "1.5rem" }}>
          <h3>Create New User</h3>
          {error && <div className="error-banner">{error}</div>}
          <div className="form-grid-2">
            <div className="field-group">
              <label>Full Name</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Juan dela Cruz" />
            </div>
            <div className="field-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" />
            </div>
            <div className="field-group">
              <label>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="encoder">Encoder</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => { setShowCreate(false); setError(""); }}>Cancel</button>
            <button className="btn-primary" onClick={createUser} disabled={creating}>{creating ? "Creating..." : "Create User"}</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading-text">Loading users...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? "row-inactive" : ""}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select className="role-select" value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      style={{ color: roleBadge[u.role] }}>
                      <option value="admin">Admin</option>
                      <option value="encoder">Encoder</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? "status-active" : "status-inactive"}`}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString("en-PH")}</td>
                  <td>
                    <button className={u.is_active ? "btn-warning-sm" : "btn-success-sm"} onClick={() => toggleActive(u)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
