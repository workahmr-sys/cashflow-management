import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user || !profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},role_target.eq.all,role_target.eq.${profile.role}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, fetchNotifications]);

  async function markAsRead(id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true })
      .or(`user_id.eq.${user.id},role_target.eq.all,role_target.eq.${profile?.role}`);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function createNotification({ title, message, type = "info", userId = null, roleTarget = "all", relatedTransactionId = null }) {
    await supabase.from("notifications").insert({
      user_id: userId,
      role_target: userId ? null : roleTarget,
      title,
      message,
      type,
      related_transaction_id: relatedTransactionId,
    });
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, createNotification, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
