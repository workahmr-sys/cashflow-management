import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { sendTelegramMessage } from "../lib/telegram";

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ telegram_bot_token: "", telegram_chat_id: "", telegram_enabled: "false" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("system_settings").select("key, value");
      if (data) {
        const map = {};
        data.forEach(row => { map[row.key] = row.value || ""; });
        setSettings(s => ({ ...s, ...map }));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase.from("system_settings").update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key)
    );
    await Promise.all(updates);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testTelegram() {
    setTesting(true); setTestResult(null);
    const result = await sendTelegramMessage("🔔 <b>CashFlow System</b>\n\nTelegram integration is working! ✅");
    setTestResult(result);
    setTesting(false);
  }

  function set(key, value) { setSettings(p => ({ ...p, [key]: value })); }

  if (loading) return <div className="page"><div className="loading-text">Loading settings...</div></div>;

  return (
    <div className="page">
      <div className="section">
        <h3>🤖 Telegram Integration</h3>
        <p className="subtitle">Configure Telegram notifications for daily summaries and alerts.</p>

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
              <p>Add your bot to a group, or message it directly. Then visit: <code>https://api.telegram.org/bot[TOKEN]/getUpdates</code> to find your chat_id.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div>
              <strong>Enter credentials below and test</strong>
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="field-group">
            <label>Bot Token</label>
            <input type="password" placeholder="123456789:ABCdefGHI..." value={settings.telegram_bot_token}
              onChange={e => set("telegram_bot_token", e.target.value)} />
          </div>
          <div className="field-group">
            <label>Chat ID</label>
            <input placeholder="-1001234567890 or 987654321" value={settings.telegram_chat_id}
              onChange={e => set("telegram_chat_id", e.target.value)} />
          </div>
          <div className="field-group">
            <label>Enable Telegram Notifications</label>
            <div className="toggle-row">
              <input type="checkbox" id="tg-enabled" checked={settings.telegram_enabled === "true"}
                onChange={e => set("telegram_enabled", e.target.checked ? "true" : "false")} />
              <label htmlFor="tg-enabled" className="toggle-label">
                {settings.telegram_enabled === "true" ? "Enabled" : "Disabled"}
              </label>
            </div>
          </div>

          {testResult && (
            <div className={`telegram-status ${testResult.success ? "tg-success" : "tg-fail"}`}>
              {testResult.success ? "✅ Test message sent successfully!" : `❌ Failed: ${testResult.reason || testResult.error || "Unknown error"}`}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-secondary" onClick={testTelegram} disabled={testing || !settings.telegram_bot_token || !settings.telegram_chat_id}>
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
