import { supabase } from "./supabase";

async function getSettings() {
  const { data } = await supabase.from("system_settings").select("key, value");
  if (!data) return null;
  const map = {};
  data.forEach(row => { map[row.key] = row.value; });
  return map;
}

export async function sendTelegramMessage(message) {
  try {
    const settings = await getSettings();
    if (!settings) return { success: false, reason: "Could not load settings" };
    if (settings.telegram_enabled !== "true") return { success: false, reason: "Telegram not enabled" };
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) return { success: false, reason: "Telegram not configured" };

    const res = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await res.json();
    return { success: result.ok, data: result };
  } catch (err) {
    console.error("Telegram send failed (non-blocking):", err);
    return { success: false, error: err.message };
  }
}

export function buildTransactionMessage({ transactionId, type, amount, personName, allocation, category, notes, dateTime }) {
  const fmt = (n) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const date = new Date(dateTime).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
  const typeIcon = type === "cash_in" ? "💚 Cash In" : "❤️ Cash Out";

  return `✅ <b>New Transaction</b>

🆔 ${transactionId}
📅 ${date}
${typeIcon} — <b>${fmt(amount)}</b>

👤 ${personName || "—"}
🗂️ Allocation: ${allocation || "—"}
🏷️ Category: ${category || "—"}
📝 ${notes}`;
}

export function buildDailySummaryMessage({ date, cashIn, cashOut, netBalance, count }) {
  const fmt = (n) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const sign = netBalance >= 0 ? "" : "";
  const netIcon = netBalance >= 0 ? "💰" : "📉";

  const d = new Date(date).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric"
  });

  return `📅 ${d}

💚 Cash In:   ${fmt(cashIn)}
❤️ Cash Out:  ${fmt(cashOut)}
─────────────────────
${netIcon} Net:       ${fmt(netBalance)}

📦 Transactions: ${count}`;
}
