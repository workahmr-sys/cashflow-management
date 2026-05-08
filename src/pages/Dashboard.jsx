import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default function Dashboard({ navigate }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ cashIn: 0, cashOut: 0, net: 0, count: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, type, transaction_id, date_time, categories(name), allocations(name)")
        .eq("is_deleted", false)
        .order("transaction_id", { ascending: false });

      if (txns) {
        const cashIn = txns.filter(t => t.type === "cash_in").reduce((s, t) => s + Number(t.amount), 0);
        const cashOut = txns.filter(t => t.type === "cash_out").reduce((s, t) => s + Number(t.amount), 0);
        setStats({ cashIn, cashOut, net: cashIn - cashOut, count: txns.length });
        setRecent(txns.slice(0, 5));
      }

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Welcome back, {profile?.full_name?.split(" ")[0]} 👋</h2>
          <p className="subtitle">Here's your financial overview</p>
        </div>
        {(profile?.role === "admin" || profile?.role === "encoder") && (
          <button className="btn-primary" onClick={() => navigate("new-transaction")}>
            ➕ New Transaction
          </button>
        )}
      </div>

      {loading ? <div className="loading-text">Loading...</div> : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-in">
              <div className="stat-label">Total Cash In</div>
              <div className="stat-value">{fmt(stats.cashIn)}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className="stat-card stat-out">
              <div className="stat-label">Total Cash Out</div>
              <div className="stat-value">{fmt(stats.cashOut)}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className={`stat-card ${stats.net >= 0 ? "stat-positive" : "stat-negative"}`}>
              <div className="stat-label">Net Balance</div>
              <div className="stat-value">{fmt(stats.net)}</div>
              <div className="stat-sub">{stats.net >= 0 ? "Surplus" : "Deficit"}</div>
            </div>
            <div className="stat-card stat-count">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{stats.count}</div>
              <div className="stat-sub">Records</div>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h3>Recent Transactions</h3>
              <button className="text-btn" onClick={() => navigate("transactions")}>View all →</button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Allocation</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr><td colSpan={5} className="empty-row">No transactions yet. <button className="link-btn" onClick={() => navigate("new-transaction")}>Create one →</button></td></tr>
                  )}
                  {recent.map(t => (
                    <tr key={t.transaction_id}>
                      <td><span className="txn-id">{t.transaction_id}</span></td>
                      <td>{t.categories?.name}</td>
                      <td>{t.allocations?.name}</td>
                      <td>
                        <span className={`type-badge ${t.type === "cash_in" ? "badge-in" : "badge-out"}`}>
                          {t.type === "cash_in" ? "Cash In" : "Cash Out"}
                        </span>
                      </td>
                      <td className={t.type === "cash_in" ? "amount-in" : "amount-out"}>
                        {t.type === "cash_out" ? "-" : "+"}{fmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
