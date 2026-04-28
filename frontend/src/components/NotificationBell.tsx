import { useEffect, useRef, useState } from "react";
import { useNotificationStore } from "../store/useNotificationStore";
import { useBoardStore } from "../store/useBoardStore";
import { useTeamStore } from "../store/useTeamStore";
import type { Notification } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  team_invite: "group_add",
  board_invite: "dashboard_customize",
};

function TeamInviteActions({ n }: { n: Notification }) {
  const { acceptTeamInvitation, declineTeamInvitation } = useTeamStore();
  const { markRead } = useNotificationStore();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  if (n.is_read) return null;
  const teamId = n.data.team_id as string | undefined;
  if (!teamId) return null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading("accept");
    try {
      await acceptTeamInvitation(teamId);
      await markRead(n.id);
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading("decline");
    try {
      await declineTeamInvitation(teamId);
      await markRead(n.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5 mt-2">
      <button
        onClick={handleAccept}
        disabled={loading !== null}
        className="flex-1 py-1 text-[11px] font-bold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
      >
        {loading === "accept" ? "..." : "Kabul Et"}
      </button>
      <button
        onClick={handleDecline}
        disabled={loading !== null}
        className="flex-1 py-1 text-[11px] font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
      >
        {loading === "decline" ? "..." : "Reddet"}
      </button>
    </div>
  );
}

function BoardInviteActions({ n }: { n: Notification }) {
  const { acceptInvitation, declineInvitation } = useBoardStore();
  const { markRead } = useNotificationStore();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  if (n.is_read) return null;

  const boardId = n.data.board_id as string | undefined;
  if (!boardId) return null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading("accept");
    try {
      await acceptInvitation(boardId);
      await markRead(n.id);
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading("decline");
    try {
      await declineInvitation(boardId);
      await markRead(n.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5 mt-2">
      <button
        onClick={handleAccept}
        disabled={loading !== null}
        className="flex-1 py-1 text-[11px] font-bold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
      >
        {loading === "accept" ? "..." : "Kabul Et"}
      </button>
      <button
        onClick={handleDecline}
        disabled={loading !== null}
        className="flex-1 py-1 text-[11px] font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
      >
        {loading === "decline" ? "..." : "Reddet"}
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-slate-500 hover:text-primary transition-all"
        aria-label="Bildirimler"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-800">Bildirimler</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <span className="material-symbols-outlined text-3xl block mb-2">
                  notifications_none
                </span>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    const hasActions = n.type === "board_invite" || n.type === "team_invite";
                    if (!n.is_read && !hasActions) markRead(n.id);
                  }}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${
                    !n.is_read ? "bg-blue-50/50" : ""
                  } ${!n.is_read && n.type !== "board_invite" && n.type !== "team_invite" ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      !n.is_read ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {TYPE_ICON[n.type] ?? "notifications"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        !n.is_read ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    {n.type === "board_invite" && <BoardInviteActions n={n} />}
                    {n.type === "team_invite" && <TeamInviteActions n={n} />}
                  </div>
                  {!n.is_read && n.type !== "board_invite" && n.type !== "team_invite" && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
