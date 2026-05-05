import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function CategoryManager() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("name");
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) { setError("Name is required"); return; }
    const dup = items.find(i => i.name.toLowerCase() === newName.trim().toLowerCase());
    if (dup) { setError("Category already exists"); return; }
    setError("");
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), created_by: user.id });
    if (error) { setError(error.message); return; }
    setNewName("");
    load();
  }

  async function toggle(item) {
    await supabase.from("categories").update({ is_active: !item.is_active }).eq("id", item.id);
    load();
  }

  return (
    <div className="page">
      <div className="page-header"><h2>Category Manager</h2></div>
      <div className="form-card" style={{ marginBottom: "1.5rem" }}>
        <h3>Add New Category</h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="inline-form">
          <input placeholder="e.g., Toll Fees, Spare Parts" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <button className="btn-primary" onClick={add}>Add</button>
        </div>
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
