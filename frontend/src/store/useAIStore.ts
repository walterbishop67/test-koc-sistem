import { create } from "zustand";
import { api } from "../api/client";
import type { AIInsightsResponse, Column, Sprint } from "../types";

// ── Streaming text parser ─────────────────────────────────────────────────────

export function parseInsightsText(text: string): AIInsightsResponse {
  const lines = text.split("\n");
  let summary = "";
  const suggestions: string[] = [];
  const risks: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("ÖZET: ")) {
      summary = t.slice(6).trim();
    } else if (t.startsWith("ÖNERİ: ")) {
      const s = t.slice(8).trim();
      if (s) suggestions.push(s);
    } else if (t.startsWith("RİSK: ")) {
      const r = t.slice(6).trim();
      if (r) risks.push(r);
    } else if (summary && t && !t.startsWith("ÖNERİ") && !t.startsWith("RİSK")) {
      summary += " " + t;
    }
  }

  return { summary: summary.trim(), suggestions, risks };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface AIState {
  boardInsights: AIInsightsResponse | null;
  streamingText: string;
  boardLoading: boolean;
  boardError: string | null;
  getBoardInsights: (
    boardTitle: string,
    columns: Column[],
    sprint: Sprint | null,
    memberCount: number
  ) => Promise<void>;
  getCardDescription: (
    cardTitle: string,
    sprintGoal?: string | null,
    columnTitle?: string | null
  ) => Promise<string>;
  clearInsights: () => void;
  chatMessages: ChatMessage[];
  chatStreaming: boolean;
  chatError: string | null;
  chatStreamingText: string;
  openBoardChat: (
    boardTitle: string,
    columns: Column[],
    sprint: Sprint | null,
    memberCount: number
  ) => Promise<void>;
  sendChatMessage: (
    userMessage: string,
    boardContext: {
      boardTitle: string;
      columns: Column[];
      sprint: Sprint | null;
      memberCount: number;
    }
  ) => Promise<void>;
  clearChat: () => void;
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildPayload(
  boardTitle: string,
  columns: Column[],
  sprint: Sprint | null,
  memberCount: number
) {
  return {
    board_title: boardTitle,
    columns: columns.map((col) => ({
      title: col.title,
      cards: col.cards.map((c) => ({
        title: c.title,
        description: c.description ? c.description.slice(0, 200) : null,
        priority: c.priority ?? null,
        due_date: c.due_date ?? null,
        assignee_email: c.assignee_email ?? null,
        sprint_id: c.sprint_id ?? null,
      })),
    })),
    sprint: sprint
      ? {
          id: sprint.id,
          name: sprint.name,
          goal: sprint.goal,
          state: sprint.state,
          start_date: sprint.start_date,
          end_date: sprint.end_date,
        }
      : null,
    total_members: memberCount,
  };
}

export const useAIStore = create<AIState>((set) => ({
  boardInsights: null,
  streamingText: "",
  boardLoading: false,
  boardError: null,
  chatMessages: [],
  chatStreaming: false,
  chatError: null,
  chatStreamingText: "",

  getBoardInsights: async (boardTitle, columns, sprint, memberCount) => {
    set({ boardLoading: true, boardError: null, streamingText: "", boardInsights: null });

    const token = localStorage.getItem("taskflow_token") ?? "";
    const payload = buildPayload(boardTitle, columns, sprint, memberCount);

    try {
      const response = await fetch("/api/v1/ai/board-insights/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail ?? `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            const final = parseInsightsText(accumulated);
            set({ boardInsights: final, boardLoading: false });
            return;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.delta) {
              accumulated += parsed.delta;
              set({ streamingText: accumulated });
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }

      // Stream ended without [DONE] — parse what we have
      const final = parseInsightsText(accumulated);
      set({ boardInsights: final, boardLoading: false });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI analysis failed.";
      set({ boardLoading: false, boardError: msg });
    }
  },

  getCardDescription: async (cardTitle, sprintGoal, columnTitle) => {
    const { data } = await api.post<{ description: string }>("/ai/card-description", {
      card_title: cardTitle,
      sprint_goal: sprintGoal ?? null,
      column_title: columnTitle ?? null,
    });
    return data.description;
  },

  clearInsights: () => set({ boardInsights: null, streamingText: "", boardError: null }),

  openBoardChat: async (boardTitle, columns, sprint, memberCount) => {
    const firstPrompt =
      "Summarize board status. Which tasks are in progress, which are delayed or urgent, and what is the sprint status?";
    set({ chatMessages: [], chatStreamingText: "", chatError: null });
    await useAIStore.getState().sendChatMessage(firstPrompt, {
      boardTitle,
      columns,
      sprint,
      memberCount,
    });
  },

  sendChatMessage: async (userMessage, boardContext) => {
    const content = userMessage.trim();
    if (!content) return;

    const prevMessages = useAIStore.getState().chatMessages;
    const nextMessages: ChatMessage[] = [...prevMessages, { role: "user", content }];
    set({
      chatMessages: nextMessages,
      chatStreaming: true,
      chatError: null,
      chatStreamingText: "",
    });

    const token = localStorage.getItem("taskflow_token") ?? "";
    const payload = {
      ...buildPayload(
        boardContext.boardTitle,
        boardContext.columns,
        boardContext.sprint,
        boardContext.memberCount
      ),
      messages: nextMessages,
    };

    try {
      const response = await fetch("/api/v1/ai/board-chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail ?? `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            set((state) => ({
              chatMessages: [...state.chatMessages, { role: "assistant", content: accumulated.trim() }],
              chatStreaming: false,
              chatStreamingText: "",
            }));
            return;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.delta) {
              accumulated += parsed.delta;
              set({ chatStreamingText: accumulated });
            }
          } catch {
            // ignore malformed sse lines
          }
        }
      }

      set((state) => ({
        chatMessages: [...state.chatMessages, { role: "assistant", content: accumulated.trim() }],
        chatStreaming: false,
        chatStreamingText: "",
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI chat failed.";
      set({ chatStreaming: false, chatError: msg });
    }
  },

  clearChat: () => set({ chatMessages: [], chatStreaming: false, chatError: null, chatStreamingText: "" }),
}));
