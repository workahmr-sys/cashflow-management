import { supabase } from "./supabase";

export async function sendTelegramMessage(message) {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value");

    if (error || !data) {
      console.error("Could not load telegram settings:", error);
      return { success: false, reason: "Could not load settings" };
    }

    const settings = {};
    data.forEach(row => { settings[row.key] = row.value; });

    if (settings.telegram_enabled !== "true") {
      return { success: false, reason: "Telegram not enabled" };
    }

    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      return { success: false, reason: "Telegram not configured" };
    }

    const token = settings.telegram_bot_token.trim();
    const chatId = settings.telegram_chat_id.trim();

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await res.json();
    return { success: result.ok, data: result, error: result.description };
  } catch (err) {
    console.error("Telegram send failed:", err);
    return { success: false, error: err.message };
  }
}

export function buildTransactionMessage({ transactionId, type, amount, personName, allocation, category, notes, dateTime }) {
  const fmt = (n) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const date = new Date(dateTime).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
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

export function buildDailySummaryMessage({ date, openingBalance, cashIn, cashOut, endingBalance, count }) {
  const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const netIcon = endingBalance >= openingBalance ? "💰" : "📉";
  const d = new Date(date).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
  });

  return `📅 ${d}

💰 Opening Balance:  ${fmt(openingBalance)}
💚 Cash In:          ${fmt(cashIn)}
❤️ Cash Out:         ${fmt(cashOut)}
─────────────────────────────
${netIcon} Ending Balance:  ${fmt(endingBalance)}

📦 Transactions: ${count}`;
}
