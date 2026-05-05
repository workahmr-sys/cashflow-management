import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { sendTelegramMessage, buildDailySummaryMessage } from "../lib/telegram";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default function DailySummary() {
  const { user, profile } = useAuth();
  const { createNotification } = useNotifications();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pastSummaries, setPastSummaries] = useState([]);
  const [telegramStatus, setTelegramStatus] = useState(null);

  useEffect(() => {
    loadPastSummaries();
  }, []);

  async function loadPastSummaries() {
    const { data } = await supabase.from("daily_summaries").select("*").order("summary_date", { ascending: false }).limit(10);
    setPastSummaries(data || []);
  }

  async function generateSummary() {
    setGenerating(true);
    setSummary(null);
    setTelegramStatus(null);

    try {
      const start = `${selectedDate}T00:00:00`;
      const end = `${selectedDate}T23:59:59`;

      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, type, allocation_id, allocations(name)")
        .eq("is_deleted", false)
        .gte("date_time", start)
        .lte("date_time", end);

      const cashIn = txns?.filter(t => t.type === "cash_in").reduce((s, t) => s + Number(t.amount), 0) || 0;
      const cashOut = txns?.filter(t => t.type === "cash_out").reduce((s, t) => s + Number(t.amount), 0) || 0;
      const netBalance = cashIn - cashOut;

      // Breakdown by allocation
      const breakdown = {};
      txns?.forEach(t => {
        const name = t.allocations?.name || "Unknown";
        if (!breakdown[name]) breakdown[name] = { in: 0, out: 0 };
        if (t.type === "cash_in") breakdown[name].in += Number(t.amount);
        else breakdown[name].out += Number(t.amount);
      });

      const summaryData = { date: selectedDate, cashIn, cashOut, netBalance, breakdown, count: txns?.length || 0 };
      setSummary(summaryData);

      // Save to DB
      const { data: saved } = await supabase.from("daily_summaries").insert({
        summary_date: selectedDate,
        total_cash_in: cashIn,
        total_cash_out: cashOut,
        net_balance: netBalance,
        allocation_breakdown: breakdown,
        triggered_by: user.id,
      }).select().single();

      // In-app notification
      await createNotification({
        title: "Daily Summary Generated",
        message: `Summary for ${selectedDate}: In ${fmt(cashIn)} / Out ${fmt(cashOut)} / Net ${fmt(netBalance)}`,
        type: "info",
        roleTarget: "all",
      });

      // Telegram
      const tgMsg = buildDailySummaryMessage({ date: selectedDate, cashIn, cashOut, netBalance, breakdown });
      const tgResult = await sendTelegramMessage(tgMsg);
      setTelegramStatus(tgResult);

      if (tgResult.success && saved) {
        await supabase.from("daily_summaries").update({ telegram_sent: true, telegram_sent_at: new Date().toISOString() }).eq("id", saved.id);
      }

      loadPastSummaries();
    } catch (err) {
      alert("Failed to generate summary: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="page">
      <div className="section">
        <h3>Generate Daily Summary</h3>
        <div className="summary-controls">
          <div className="field-group" style={{ flex: 1 }}>
            <label>Select Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <button className="btn-primary" onClick={generateSummary} disabled={generating} style={{ alignSelf: "flex-end" }}>
            {generating ? "Generating..." : "📊 Generate Summary"}
          </button>
        </div>

        {summary && (
          <div className="summary-result">
            <h4>Summary for {summary.date}</h4>
            <div className="summary-stats">
              <div className="summary-stat-card stat-in">
                <div className="stat-label">Cash In</div>
                <div className="stat-value">{fmt(summary.cashIn)}</div>
              </div>
              <div className="summary-stat-card stat-out">
                <div className="stat-label">Cash Out</div>
                <div className="stat-value">{fmt(summary.cashOut)}</div>
              </div>
              <div className={`summary-stat-card ${summary.netBalance >= 0 ? "stat-positive" : "stat-negative"}`}>
                <div className="stat-label">Net Balance</div>
                <div className="stat-value">{fmt(summary.netBalance)}</div>
              </div>
              <div className="summary-stat-card stat-count">
                <div className="stat-label">Transactions</div>
                <div className="stat-value">{summary.count}</div>
              </div>
            </div>

            {Object.keys(summary.breakdown).length > 0 && (
              <div className="breakdown-table">
                <h5>Breakdown by Allocation</h5>
                <table className="data-table">
                  <thead><tr><th>Allocation</th><th>Cash In</th><th>Cash Out</th><th>Net</th></tr></thead>
                  <tbody>
                    {Object.entries(summary.breakdown).map(([name, data]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td className="amount-in">+{fmt(data.in)}</td>
                        <td className="amount-out">-{fmt(data.out)}</td>
                        <td className={data.in - data.out >= 0 ? "amount-in" : "amount-out"}>{fmt(data.in - data.out)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {telegramStatus && (
              <div className={`telegram-status ${telegramStatus.success ? "tg-success" : "tg-fail"}`}>
                {telegramStatus.success ? "✅ Telegram notification sent!" : `⚠️ Telegram not sent: ${telegramStatus.reason || "Not configured"}`}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Past Summaries</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Cash In</th><th>Cash Out</th><th>Net</th><th>Telegram</th><th>Generated</th></tr>
            </thead>
            <tbody>
              {pastSummaries.length === 0 && <tr><td colSpan={6} className="empty-row">No summaries yet</td></tr>}
              {pastSummaries.map(s => (
                <tr key={s.id}>
                  <td>{s.summary_date}</td>
                  <td className="amount-in">+{fmt(s.total_cash_in)}</td>
                  <td className="amount-out">-{fmt(s.total_cash_out)}</td>
                  <td className={s.net_balance >= 0 ? "amount-in" : "amount-out"}>{fmt(s.net_balance)}</td>
                  <td>{s.telegram_sent ? "✅ Sent" : <span className="muted">—</span>}</td>
                  <td>{new Date(s.created_at).toLocaleString("en-PH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
