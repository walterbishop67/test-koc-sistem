import { create } from "zustand";
import { api } from "../api/client";
import type { Sprint } from "../types";

interface SprintPayload {
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

interface SprintState {
  sprints: Sprint[];
  fetchSprints: (boardId: string) => Promise<void>;
  createSprint: (boardId: string, data: SprintPayload) => Promise<Sprint>;
  updateSprint: (id: string, data: Partial<SprintPayload>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;
  startSprint: (id: string) => Promise<void>;
  completeSprint: (id: string) => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, _get) => ({
  sprints: [],

  fetchSprints: async (boardId) => {
    const { data } = await api.get<Sprint[]>(`/boards/${boardId}/sprints`);
    set({ sprints: data });
  },

  createSprint: async (boardId, payload) => {
    const { data } = await api.post<Sprint>(`/boards/${boardId}/sprints`, payload);
    set((s) => ({ sprints: [...s.sprints, data] }));
    return data;
  },

  updateSprint: async (id, payload) => {
    const { data } = await api.put<Sprint>(`/sprints/${id}`, payload);
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? data : sp)) }));
  },

  deleteSprint: async (id) => {
    await api.delete(`/sprints/${id}`);
    set((s) => ({ sprints: s.sprints.filter((sp) => sp.id !== id) }));
  },

  startSprint: async (id) => {
    const { data } = await api.patch<Sprint>(`/sprints/${id}/start`);
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? data : sp)) }));
  },

  completeSprint: async (id) => {
    const { data } = await api.patch<Sprint>(`/sprints/${id}/complete`);
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? data : sp)) }));
  },
}));
