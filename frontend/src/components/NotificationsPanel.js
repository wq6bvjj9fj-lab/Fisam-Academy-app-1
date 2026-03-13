import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, BookOpen, MessageSquare, Check, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function NotificationsPanel() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/notifications/unread-count`, { headers });
      setUnreadCount(data.count);
    } catch {}
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`, { headers });
      setNotifications(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`, {}, { headers });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Tutte le notifiche lette");
    } catch {}
  };

  const getIcon = (type) => {
    if (type === "lesson") return <BookOpen className="w-4 h-4 text-[#F5A623]" />;
    return <MessageSquare className="w-4 h-4 text-[#F5A623]" />;
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "Adesso";
    if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-white/60 hover:text-white transition-colors"
          data-testid="notifications-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-[#121212] border-white/10"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3
            className="text-white font-bold text-sm tracking-wider uppercase"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Notifiche
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[#F5A623] text-xs hover:text-[#FFB74D] flex items-center gap-1 transition-colors"
              data-testid="mark-all-read"
            >
              <CheckCheck className="w-3 h-3" />
              Segna tutte lette
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-white/30 text-sm">
              Nessuna notifica
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 transition-colors cursor-pointer hover:bg-white/5 ${
                    !n.is_read ? "bg-[#F5A623]/5" : ""
                  }`}
                  onClick={() => !n.is_read && markRead(n.id)}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.is_read ? "text-white" : "text-white/60"}`}>
                      {n.message}
                    </p>
                    <p className="text-white/30 text-xs mt-1">{formatTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-[#F5A623] rounded-full mt-1.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
