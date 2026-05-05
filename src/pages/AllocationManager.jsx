import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function AllocationManager() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("allocations").select("*").order("name");
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) { setError("Name is required"); return; }
    const dup = items.find(i => i.name.toLowerCase() === newName.trim().toLowerCase());
    if (dup) { setError("Allocation already exists"); return; }
    setError("");
    const { error } = await supabase.from("allocations").insert({ name: newName.trim(), created_by: user.id });
    if (error) { setError(error.message); return; }
    setNewName("");
    load();
  }

  async function toggle(item) {
    await supabase.from("allocations").update({ is_active: !item.is_active }).eq("id", item.id);
    load();
  }

  return (
    <div className="page">
      <div className="page-header"><h2>Allocation Manager</h2></div>
      <div className="form-card" style={{ marginBottom: "1.5rem" }}>
        <h3>Add New Allocation</h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="inline-form">
          <input placeholder="e.g., ABC-123 or New Category" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <button className="btn-primary" onClick={add}>Add</button>
        </div>
        <p className="field-hint">Add plate numbers (e.g., ABC-123) or other allocation names</p>
      </div>

      {loading ? <div className="loading-text">Loading...</div> : (
        <div className="chips-list">
          {items.map(item => (
            <div key={item.id} className={`chip ${!item.is_active ? "chip-inactive" : ""}`}>
              <span>{item.name}</span>
              <button onClick={() => toggle(item)} className="chip-toggle">
                {item.is_active ? "✕" : "↩"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
