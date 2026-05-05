import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const actionColor = { create: "#22c55e", edit: "#f59e0b", delete: "#ef4444" };

  return (
    <div className="page">
      <div className="section">
        <h3>Audit Trail</h3>
        <p className="subtitle">Complete record of all system actions</p>
        {loading ? <div className="loading-text">Loading...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Action</th><th>Transaction</th><th>Changes</th></tr>
              </thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={5} className="empty-row">No audit records yet</td></tr>}
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="date-cell">{new Date(log.created_at).toLocaleString("en-PH")}</td>
                    <td>{log.profiles?.full_name}</td>
                    <td>
                      <span className="action-badge" style={{ background: actionColor[log.action] + "20", color: actionColor[log.action] }}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td><span className="txn-id">{log.transaction_ref || "—"}</span></td>
                    <td>
                      {log.action === "edit" && log.before_values && log.after_values ? (
                        <details>
                          <summary className="changes-toggle">View changes</summary>
                          <div className="changes-diff">
                            <div className="diff-before">
                              <strong>Before:</strong>
                              <pre>{JSON.stringify(log.before_values, null, 2)}</pre>
                            </div>
                            <div className="diff-after">
                              <strong>After:</strong>
                              <pre>{JSON.stringify(log.after_values, null, 2)}</pre>
                            </div>
                          </div>
                        </details>
                      ) : log.action === "create" ? (
                        <span className="muted">New record created</span>
                      ) : log.action === "delete" ? (
                        <span className="muted" style={{ color: "#ef4444" }}>Record deleted</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
