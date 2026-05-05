import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { logAudit } from "../lib/audit";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default function TransactionList() {
  const { user, profile, isAdmin } = useAuth();
  const { createNotification } = useNotifications();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    notes_search: "",
    person_id: "",
    type: "",
    category_id: "",
    allocation_id: "",
    date_from: "",
    date_to: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("*, categories(name), allocations(name), profiles!transactions_person_responsible_id_fkey(full_name), people(name)")
      .eq("is_deleted", false)
      .order("date_time", { ascending: false });

    if (filters.type) q = q.eq("type", filters.type);
    if (filters.category_id) q = q.eq("category_id", filters.category_id);
    if (filters.allocation_id) q = q.eq("allocation_id", filters.allocation_id);
    if (filters.person_id) q = q.eq("person_id", filters.person_id);
    if (filters.date_from) q = q.gte("date_time", filters.date_from);
    if (filters.date_to) q = q.lte("date_time", filters.date_to + "T23:59:59");
    if (filters.search) q = q.ilike("transaction_id", `%${filters.search}%`);
    if (filters.notes_search) q = q.ilike("notes", `%${filters.notes_search}%`);

    const { data } = await q;
    setTransactions(data || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
    async function loadDropdowns() {
      const [{ data: cats }, { data: allocs }, { data: ppl }] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("allocations").select("id, name").eq("is_active", true).order("name"),
        supabase.from("people").select("id, name").eq("is_active", true).order("name"),
      ]);
      setCategories(cats || []);
      setAllocations(allocs || []);
      setPeople(ppl || []);
    }
    loadDropdowns();
  }, [load]);

  async function handleDelete(txn) {
    const before = { ...txn };
    const { error } = await supabase.from("transactions").update({ is_deleted: true }).eq("id", txn.id);
    if (error) return alert("Delete failed: " + error.message);
    await logAudit({ userId: user.id, action: "delete", entityId: txn.id, transactionRef: txn.transaction_id, beforeValues: before });
    await createNotification({ title: "Transaction Deleted", message: `${txn.transaction_id} was deleted by ${profile?.full_name}`, type: "warning", roleTarget: "admin" });
    setDeleteConfirm(null);
    load();
  }

  async function handleEdit(updated) {
    const before = editModal;
    const { error } = await supabase.from("transactions").update({
      amount: Number(updated.amount),
      type: updated.type,
      category_id: updated.category_id,
      allocation_id: updated.allocation_id,
      person_id: updated.person_id,
      notes: updated.notes,
      reference: updated.reference || null,
      date_time: updated.date_time,
    }).eq("id", updated.id);
    if (error) return alert("Update failed: " + error.message);
    await logAudit({ userId: user.id, action: "edit", entityId: updated.id, transactionRef: updated.transaction_id, beforeValues: before, afterValues: updated });
    await createNotification({ title: "Transaction Edited", message: `${updated.transaction_id} was updated by ${profile?.full_name}`, type: "info", roleTarget: "admin" });
    setEditModal(null);
    load();
  }

  function clearFilters() {
    setFilters({ search: "", notes_search: "", person_id: "", type: "", category_id: "", allocation_id: "", date_from: "", date_to: "" });
  }

  const totalIn = transactions.filter(t => t.type === "cash_in").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === "cash_out").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="page">
      {/* Filters */}
      <div className="filter-bar">
        <input className="filter-search" placeholder="🔍 Search by Transaction ID..."
          value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
        <input className="filter-search" placeholder="🔍 Search by Notes..."
          value={filters.notes_search} onChange={e => setFilters(p => ({ ...p, notes_search: e.target.value }))} />
        <select value={filters.person_id} onChange={e => setFilters(p => ({ ...p, person_id: e.target.value }))}>
          <option value="">All Payees/Payers</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="cash_in">Cash In</option>
          <option value="cash_out">Cash Out</option>
        </select>
        <select value={filters.category_id} onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.allocation_id} onChange={e => setFilters(p => ({ ...p, allocation_id: e.target.value }))}>
          <option value="">All Allocations</option>
          {allocations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
        <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
        <button className="btn-secondary" onClick={clearFilters}>Clear</button>
      </div>

      {/* Summary strip */}
      <div className="summary-strip">
        <span className="strip-in">↑ In: {fmt(totalIn)}</span>
        <span className="strip-out">↓ Out: {fmt(totalOut)}</span>
        <span className={`strip-net ${totalIn - totalOut >= 0 ? "strip-pos" : "strip-neg"}`}>Net: {fmt(totalIn - totalOut)}</span>
        <span className="strip-count">{transactions.length} record{transactions.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? <div className="loading-text">Loading transactions...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Payee / Payer</th>
                <th>Category</th>
                <th>Allocation</th>
                <th>Notes</th>
                <th>Ref</th>
                <th>Encoded By</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={11} className="empty-row">No transactions found</td></tr>
              )}
              {transactions.map(t => (
                <tr key={t.id}>
                  <td><span className="txn-id">{t.transaction_id}</span></td>
                  <td className="date-cell">{new Date(t.date_time).toLocaleString("en-PH")}</td>
                  <td><span className={`type-badge ${t.type === "cash_in" ? "badge-in" : "badge-out"}`}>{t.type === "cash_in" ? "Cash In" : "Cash Out"}</span></td>
                  <td className={t.type === "cash_in" ? "amount-in" : "amount-out"}>{t.type === "cash_out" ? "-" : "+"}{fmt(t.amount)}</td>
                  <td><strong>{t.people?.name || <span className="muted">—</span>}</strong></td>
                  <td>{t.categories?.name}</td>
                  <td>{t.allocations?.name}</td>
                  <td className="notes-cell" title={t.notes}>{t.notes.length > 30 ? t.notes.slice(0, 30) + "…" : t.notes}</td>
                  <td>{t.reference || <span className="muted">—</span>}</td>
                  <td className="muted">{t.profiles?.full_name}</td>
                  {isAdmin && (
                    <td>
                      <div className="action-btns">
                        <button className="action-edit" onClick={() => setEditModal({ ...t, category_id: t.category_id, allocation_id: t.allocation_id, person_id: t.person_id })}>✏️</button>
                        <button className="action-delete" onClick={() => setDeleteConfirm(t)}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div className="modal-danger">
            <h3>Delete Transaction?</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.transaction_id}</strong>? This action is logged and cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {editModal && <EditModal txn={editModal} categories={categories} allocations={allocations} people={people} onClose={() => setEditModal(null)} onSave={handleEdit} />}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function EditModal({ txn, categories, allocations, people, onClose, onSave }) {
  const [form, setForm] = useState({
    ...txn,
    date_time: new Date(txn.date_time).toISOString().slice(0, 16),
  });
  const [errors, setErrors] = useState({});

  function set(field, value) { setForm(p => ({ ...p, [field]: value })); }

  function validate() {
    const e = {};
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Amount must be > 0";
    if (!form.notes?.trim()) e.notes = "Notes required";
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-edit">
        <h3>Edit Transaction — {txn.transaction_id}</h3>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Date & Time</label>
            <input type="datetime-local" value={form.date_time} onChange={e => set("date_time", e.target.value)} />
          </div>
          <div className="field-group">
            <label>Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="cash_in">Cash In</option>
              <option value="cash_out">Cash Out</option>
            </select>
          </div>
          <div className="field-group">
            <label>Amount</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} className={errors.amount ? "input-error" : ""} />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </div>
          <div className="field-group">
            <label>Payee / Payer</label>
            <select value={form.person_id || ""} onChange={e => set("person_id", e.target.value)}>
              <option value="">Select person...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label>Category</label>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label>Allocation</label>
            <select value={form.allocation_id} onChange={e => set("allocation_id", e.target.value)}>
              {allocations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label>Notes *</label>
            <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className={errors.notes ? "input-error" : ""} />
            {errors.notes && <span className="field-error">{errors.notes}</span>}
          </div>
          <div className="field-group">
            <label>Reference</label>
            <input type="text" value={form.reference || ""} onChange={e => set("reference", e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
