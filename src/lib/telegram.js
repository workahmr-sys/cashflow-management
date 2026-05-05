import { supabase } from "./supabase";

export async function sendTelegramMessage(message) {
  try {
    const { data: tokenRow } = await supabase.from("system_settings").select("value").eq("key", "telegram_bot_token").single();
    const { data: chatRow } = await supabase.from("system_settings").select("value").eq("key", "telegram_chat_id").single();
    const { data: enabledRow } = await supabase.from("system_settings").select("value").eq("key", "telegram_enabled").single();

    if (enabledRow?.value !== "true" || !tokenRow?.value || !chatRow?.value) return { success: false, reason: "Telegram not configured" };

    const res = await fetch(`https://api.telegram.org/bot${tokenRow.value}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatRow.value, text: message, parse_mode: "HTML" }),
    });

    const result = await res.json();
    return { success: result.ok, data: result };
  } catch (err) {
    console.error("Telegram send failed (non-blocking):", err);
    return { success: false, error: err.message };
  }
}

export function buildDailySummaryMessage({ date, cashIn, cashOut, netBalance, breakdown }) {
  const fmt = (n) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const sign = netBalance >= 0 ? "+" : "";
  let msg = `📊 <b>DAILY SUMMARY REPORT</b>\n`;
  msg += `📅 Date: ${date}\n\n`;
  msg += `💚 Cash In: ${fmt(cashIn)}\n`;
  msg += `❤️ Cash Out: ${fmt(cashOut)}\n`;
  msg += `━━━━━━━━━━━━━━\n`;
  msg += `💰 Net Balance: ${sign}${fmt(netBalance)}\n\n`;

  if (breakdown && Object.keys(breakdown).length > 0) {
    msg += `📂 <b>By Allocation:</b>\n`;
    Object.entries(breakdown).forEach(([name, data]) => {
      msg += `  • ${name}: In ${fmt(data.in)} / Out ${fmt(data.out)}\n`;
    });
    msg += `\n`;
  }

  msg += `✅ Status: Completed`;
  return msg;
}
