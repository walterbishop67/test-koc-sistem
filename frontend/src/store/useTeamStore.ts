import { create } from "zustand";
import { api } from "../api/client";
import type { Team, TeamMember } from "../types";

interface TeamState {
  teams: Team[];
  teamMembers: Record<string, TeamMember[]>;

  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<void>;
  fetchTeamMembers: (teamId: string) => Promise<TeamMember[]>;
  addTeamMember: (teamId: string, email: string) => Promise<void>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;

  acceptTeamInvitation: (teamId: string) => Promise<void>;
  declineTeamInvitation: (teamId: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  teamMembers: {},

  fetchTeams: async () => {
    const { data } = await api.get<Team[]>("/teams");
    set({ teams: data });
  },

  createTeam: async (name) => {
    const { data } = await api.post<Team>("/teams", { name });
    set((s) => ({ teams: [...s.teams, data] }));
    return data;
  },

  deleteTeam: async (teamId) => {
    await api.delete(`/teams/${teamId}`);
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== teamId),
      teamMembers: Object.fromEntries(
        Object.entries(s.teamMembers).filter(([id]) => id !== teamId)
      ),
    }));
  },

  fetchTeamMembers: async (teamId) => {
    const { data } = await api.get<TeamMember[]>(`/teams/${teamId}/members`);
    set((s) => ({ teamMembers: { ...s.teamMembers, [teamId]: data } }));
    return data;
  },

  addTeamMember: async (teamId, email) => {
    const { data } = await api.post<TeamMember>(`/teams/${teamId}/members`, { email });
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [teamId]: [...(s.teamMembers[teamId] ?? []), data],
      },
    }));
  },

  removeTeamMember: async (teamId, memberId) => {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [teamId]: (s.teamMembers[teamId] ?? []).filter((m) => m.id !== memberId),
      },
    }));
  },

  acceptTeamInvitation: async (teamId) => {
    await api.post(`/teams/invitations/${teamId}/accept`);
    const { data } = await api.get<Team[]>("/teams");
    set({ teams: data });
  },

  declineTeamInvitation: async (teamId) => {
    await api.post(`/teams/invitations/${teamId}/decline`);
  },
}));
