import { create } from "zustand";
import { api } from "../api/client";
import type { Notification } from "../types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const { data } = await api.get<Notification[]>("/notifications");
    set({
      notifications: data,
      unreadCount: data.filter((n) => !n.is_read).length,
    });
  },

  markRead: async (id) => {
    await api.post(`/notifications/${id}/read`);
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length };
    });
  },

  markAllRead: async () => {
    await api.post("/notifications/read-all");
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
