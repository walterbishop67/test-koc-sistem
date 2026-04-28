import { create } from "zustand";
import { api } from "../api/client";
import type { Board, Project } from "../types";

interface ProjectStore {
  projects: Project[];
  fetchProjects: () => Promise<Project[]>;
  createProject: (title: string, description: string) => Promise<Project>;
  updateProject: (id: string, title: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjectBoards: (projectId: string) => Promise<Board[]>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],

  fetchProjects: async () => {
    const { data } = await api.get<Project[]>("/projects");
    set({ projects: data });
    return data;
  },

  createProject: async (title, description) => {
    const { data } = await api.post<Project>("/projects", { title, description });
    set({ projects: [...get().projects, data] });
    return data;
  },

  updateProject: async (id, title, description) => {
    await api.put(`/projects/${id}`, { title, description });
    set({
      projects: get().projects.map((p) =>
        p.id === id ? { ...p, title, description } : p
      ),
    });
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  fetchProjectBoards: async (projectId) => {
    const { data } = await api.get<Board[]>(`/projects/${projectId}/boards`);
    return data;
  },
}));
