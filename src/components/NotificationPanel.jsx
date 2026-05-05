import { useNotifications } from "../contexts/NotificationContext";

const typeStyles = {
  success: { icon: "✅", color: "#22c55e" },
  error: { icon: "❌", color: "#ef4444" },
  info: { icon: "ℹ️", color: "#3b82f6" },
  warning: { icon: "⚠️", color: "#f59e0b" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="notif-panel-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-panel-header">
          <h2>Notifications</h2>
          <div className="notif-panel-actions">
            <button className="text-btn" onClick={markAllAsRead}>Mark all read</button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="notif-list">
          {notifications.length === 0 && (
            <div className="notif-empty">No notifications yet</div>
          )}
          {notifications.map(n => {
            const style = typeStyles[n.type] || typeStyles.info;
            return (
              <div
                key={n.id}
                className={`notif-item ${!n.is_read ? "notif-unread" : ""}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="notif-item-icon" style={{ color: style.color }}>{style.icon}</div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-msg">{n.message}</div>
                  <div className="notif-item-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div className="notif-dot" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
