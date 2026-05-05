import { supabase } from "./supabase";

export async function logAudit({ userId, action, entityId, transactionRef, beforeValues, afterValues }) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "transaction",
      entity_id: entityId,
      transaction_ref: transactionRef,
      before_values: beforeValues || null,
      after_values: afterValues || null,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
