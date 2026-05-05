import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

async function sendTelegramDirect(token, chatId, message) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    const result = await res.json();
    return { success: result.ok, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default function Settings() {
  const { user } = useAuth();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("system_settings").select("key, value");
      if (data) {
        data.forEach(row => {
          if (row.key === "telegram_bot_token") setBotToken(row.value || "");
          if (row.key === "telegram_chat_id") setChatId(row.value || "");
          if (row.key === "telegram_enabled") setEnabled(row.value === "true");
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    await Promise.all([
      supabase.from("system_settings").update({ value: botToken, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "telegram_bot_token"),
      supabase.from("system_settings").update({ value: chatId, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "telegram_chat_id"),
      supabase.from("system_settings").update({ value: enabled ? "true" : "false", updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "telegram_enabled"),
    ]);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testTelegram() {
    if (!botToken || !chatId) {
      setTestResult({ success: false, reason: "Please enter Bot Token and Chat ID first" });
      return;
    }
    setTesting(true); setTestResult(null);
    const result = await sendTelegramDirect(botToken, chatId, "🔔 <b>CashFlow System</b>\n\nTelegram integration is working! ✅");
    setTestResult(result);
    setTesting(false);
  }

  if (loading) return <div className="page"><div className="loading-text">Loading settings...</div></div>;

  return (
    <div className="page">
      <div className="section">
        <h3>🤖 Telegram Integration</h3>
        <p className="subtitle">Configure Telegram notifications for daily summaries.</p>

        <div className="settings-steps">
          <div className="step-card">
            <div className="step-number">1</div>
            <div>
              <strong>Create a Telegram Bot</strong>
              <p>Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram. Send <code>/newbot</code> and follow the steps to get your Bot Token.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div>
              <strong>Get your Chat ID</strong>
              <p>Add your bot to a group, send a message, then visit: <code>https://api.telegram.org/bot[TOKEN]/getUpdates</code> to find your chat_id.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div><strong>Enter credentials below and test</strong></div>
          </div>
        </div>

        <div className="form-card">
          <div className="field-group">
            <label>Bot Token</label>
            <input
              type="text"
              placeholder="123456789:ABCdefGHI..."
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Chat ID</label>
            <input
              placeholder="-1001234567890 or 987654321"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Enable Telegram Notifications</label>
            <div className="toggle-row">
              <input
                type="checkbox"
                id="tg-enabled"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
              />
              <label htmlFor="tg-enabled" className="toggle-label">
                {enabled ? "✅ Enabled" : "Disabled"}
              </label>
            </div>
          </div>

          {testResult && (
            <div className={`telegram-status ${testResult.success ? "tg-success" : "tg-fail"}`}>
              {testResult.success
                ? "✅ Test message sent successfully! Check your Telegram group."
                : `❌ Failed: ${testResult.reason || testResult.error || "Unknown error"}`}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-secondary" onClick={testTelegram} disabled={testing}>
              {testing ? "Sending..." : "🧪 Test Connection"}
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : saved ? "✅ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
