import { useEffect, useRef, useState } from "react";
import { listNotifications, markAsRead, markAllAsRead } from "../api/notifications";

const POLL_INTERVAL_MS = 30000;

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  async function refresh() {
    try {
      const data = await listNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — a failed poll shouldn't disrupt the rest of the dashboard.
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
  }

  async function handleNotificationClick(n) {
    if (n.read) return;
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markAsRead(n._id);
    } catch {
      refresh(); // reconcile if the request failed
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllAsRead();
    } catch {
      refresh();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-badge-red-text text-white text-[9px] font-medium rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-card shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-navy-light hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-500 px-3 py-4 text-center">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${n.read ? "" : "bg-badge-blue-bg/40"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-gray-900">{n.title}</p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-navy-light flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
