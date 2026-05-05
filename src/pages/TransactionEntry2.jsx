import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { logAudit } from "../lib/audit";
import { sendTelegramMessage, buildTransactionMessage } from "../lib/telegram";

const EMPTY_FORM = { amount: "", type: "", category_id: "", allocation_id: "", person_id: "", notes: "", reference: "" };

export default function TransactionEntry({ navigate }) {
  const { user, profile } = useAuth();
  const { createNotification } = useNotifications();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);

  useEffect(() => {
    loadDropdowns();
  }, []);

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

  async function addNewPerson() {
    if (!newPersonName.trim()) return;
    setAddingPerson(true);
    const { data, error } = await supabase.from("people").insert({ name: newPersonName.trim(), created_by: user.id }).select().single();
    if (!error && data) {
      setPeople(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, person_id: data.id }));
      setNewPersonName("");
      setShowAddPerson(false);
    }
    setAddingPerson(false);
  }

  function validate() {
    const e = {};
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Amount must be greater than 0";
    if (!form.type) e.type = "Please select a transaction type";
    if (!form.category_id) e.category_id = "Please select a category";
    if (!form.allocation_id) e.allocation_id = "Please select an allocation";
    if (!form.person_id) e.person_id = "Please select a payee/payer";
    if (!form.notes.trim()) e.notes = "Notes are required";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        amount: Number(form.amount),
        type: form.type,
        category_id: form.category_id,
        allocation_id: form.allocation_id,
        person_responsible_id: user.id,
        person_id: form.person_id,
        notes: form.notes.trim(),
        reference: form.reference.trim() || null,
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert(payload)
        .select("*, categories(name), allocations(name), people(name)")
        .single();

      if (error) throw error;

      // Audit log
      await logAudit({
        userId: user.id,
        action: "create",
        entityId: data.id,
        transactionRef: data.transaction_id,
        afterValues: payload,
      });

      // In-app notification
      await createNotification({
        title: "Transaction Created",
        message: `${data.transaction_id} — ${data.type === "cash_in" ? "Cash In" : "Cash Out"} ₱${Number(data.amount).toLocaleString()} by ${profile?.full_name}`,
        type: "success",
        roleTarget: "all",
        relatedTransactionId: data.id,
      });

      // Telegram notification (non-blocking)
      sendTelegramMessage(buildTransactionMessage({
        transactionId: data.transaction_id,
        type: data.type,
        amount: data.amount,
        personName: data.people?.name,
        allocation: data.allocations?.name,
        category: data.categories?.name,
        notes: data.notes,
        dateTime: data.date_time || new Date().toISOString(),
      }));

      setSuccess(data.transaction_id);
      setForm(EMPTY_FORM);
    } catch (err) {
      setErrors({ submit: err.message || "Failed to save transaction. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  }

  if (success) {
    return (
      <div className="page">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <h2>Transaction Saved!</h2>
          <p className="txn-id-display">{success}</p>
          <p>Your transaction has been recorded successfully.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => setSuccess(null)}>➕ New Transaction</button>
            <button className="btn-secondary" onClick={() => navigate("transactions")}>📋 View All</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="form-container">
        <div className="form-card">
          <h2 className="form-title">New Transaction</h2>
          <p className="form-sub">All fields marked * are required</p>

          {errors.submit && <div className="error-banner">{errors.submit}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Type */}
            <div className="field-group">
              <label>Transaction Type *</label>
              <div className="type-toggle">
                <button type="button" className={`type-btn ${form.type === "cash_in" ? "type-btn-in-active" : ""}`}
                  onClick={() => set("type", "cash_in")}>
                  ↑ Cash In
                </button>
                <button type="button" className={`type-btn ${form.type === "cash_out" ? "type-btn-out-active" : ""}`}
                  onClick={() => set("type", "cash_out")}>
                  ↓ Cash Out
                </button>
              </div>
              {errors.type && <span className="field-error">{errors.type}</span>}
            </div>

            {/* Amount */}
            <div className="field-group">
              <label>Amount (₱) *</label>
              <input type="number" min="0.01" step="0.01" placeholder="0.00"
                value={form.amount} onChange={e => set("amount", e.target.value)}
                className={errors.amount ? "input-error" : ""} />
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </div>

            {/* Payee/Payer */}
            <div className="field-group">
              <label>{form.type === "cash_in" ? "Received From *" : form.type === "cash_out" ? "Paid To *" : "Payee / Payer *"}</label>
              <div className="inline-form">
                <select value={form.person_id} onChange={e => set("person_id", e.target.value)}
                  className={errors.person_id ? "input-error" : ""}>
                  <option value="">Select person...</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" className="btn-secondary" onClick={() => setShowAddPerson(!showAddPerson)}>
                  + New
                </button>
              </div>
              {errors.person_id && <span className="field-error">{errors.person_id}</span>}
              {showAddPerson && (
                <div className="inline-form" style={{ marginTop: "0.5rem" }}>
                  <input placeholder="Enter person name..." value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addNewPerson()} />
                  <button type="button" className="btn-primary" onClick={addNewPerson} disabled={addingPerson}>
                    {addingPerson ? "..." : "Add"}
                  </button>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="field-group">
              <label>Category *</label>
              <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                className={errors.category_id ? "input-error" : ""}>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category_id && <span className="field-error">{errors.category_id}</span>}
            </div>

            {/* Allocation */}
            <div className="field-group">
              <label>Allocation *</label>
              <select value={form.allocation_id} onChange={e => set("allocation_id", e.target.value)}
                className={errors.allocation_id ? "input-error" : ""}>
                <option value="">Select allocation...</option>
                {allocations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.allocation_id && <span className="field-error">{errors.allocation_id}</span>}
            </div>

            {/* Notes */}
            <div className="field-group">
              <label>Notes *</label>
              <textarea rows={3} placeholder="Describe this transaction..."
                value={form.notes} onChange={e => set("notes", e.target.value)}
                className={errors.notes ? "input-error" : ""} />
              {errors.notes && <span className="field-error">{errors.notes}</span>}
            </div>

            {/* Reference */}
            <div className="field-group">
              <label>Reference <span className="optional">(optional)</span></label>
              <input type="text" placeholder="Receipt no., OR number, invoice..."
                value={form.reference} onChange={e => set("reference", e.target.value)} />
            </div>

            {/* Encoded By (read-only) */}
            <div className="field-group">
              <label>Encoded By</label>
              <input type="text" value={profile?.full_name || "Loading..."} disabled className="input-readonly" />
              <span className="field-hint">Auto-assigned from your account</span>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); }}>
                Clear
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
