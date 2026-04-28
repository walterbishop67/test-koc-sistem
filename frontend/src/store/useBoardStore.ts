import { create } from "zustand";
import { generateKeyBetween } from "fractional-indexing";
import { api } from "../api/client";
import type { Board, Column, Card, BoardMember, Priority, Comment, GeneratedColumn, CardActivity, Label } from "../types";

const _BASE_62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function _isValidFractionalKey(pos: string): boolean {
  if (!pos) return false;
  const head = pos.charCodeAt(0);
  const expectedLen =
    head >= 97 && head <= 122 ? head - 97 + 2 :  // 'a'-'z'
    head >= 65 && head <= 90  ? 90 - head + 2  :  // 'A'-'Z'
    -1;
  return expectedLen > 0 && pos.length >= expectedLen;
}

function _normalizePositions<T extends { position: string }>(items: T[]): T[] {
  if (items.length === 0 || items.every((it) => _isValidFractionalKey(it.position))) return items;
  const sorted = [...items].sort((a, b) => (a.position < b.position ? -1 : 1));
  return sorted.map((item, i) => ({ ...item, position: `a${_BASE_62[i % 62]}` }));
}

/** Modal açılırken anında gösterilecek optimistik aktiviteler (Zustand dışı). */
export const pendingActivityMap = new Map<string, CardActivity>();

interface CardPatch {
  title?: string;
  description?: string;
  priority?: Priority | null;
  assignee_email?: string | null;
  due_date?: string | null;
  sprint_id?: string | null;
}

interface BoardState {
  boards: Board[];
  archivedBoards: Board[];
  columns: Column[];
  members: BoardMember[];
  activeBoard: Board | null;

  fetchBoards: () => Promise<Board[]>;
  fetchArchivedBoards: () => Promise<void>;
  createBoard: (
    title: string,
    initialSprint?: { name: string; start_date?: string; end_date?: string; goal?: string },
    teamId?: string,
    aiColumns?: GeneratedColumn[],
    projectId?: string,
  ) => Promise<Board>;
  updateBoard: (id: string, title: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  archiveBoard: (id: string) => Promise<void>;
  unarchiveBoard: (id: string) => Promise<void>;

  fetchColumns: (boardId: string) => Promise<void>;
  createColumn: (boardId: string, title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  renameColumn: (columnId: string, title: string) => Promise<void>;

  createCard: (columnId: string, title: string) => Promise<void>;
  updateCard: (cardId: string, data: CardPatch) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;

  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    overCardId: string | null
  ) => Promise<void>;

  moveColumn: (columnId: string, overColumnId: string | null) => Promise<void>;

  setActiveBoard: (board: Board | null) => void;

  fetchMembers: (boardId: string) => Promise<void>;
  inviteMember: (boardId: string, email: string, role?: string) => Promise<void>;
  removeMember: (boardId: string, memberId: string) => Promise<void>;

  pendingInvitations: BoardMember[];
  fetchPendingInvitations: () => Promise<void>;
  acceptInvitation: (boardId: string) => Promise<void>;
  declineInvitation: (boardId: string) => Promise<void>;

  comments: Comment[];
  fetchComments: (cardId: string) => Promise<void>;
  addComment: (cardId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, cardId: string) => Promise<void>;

  assignCardToSprint: (cardId: string, sprintId: string | null) => Promise<void>;

  updateCardLabels: (cardId: string, labels: Label[]) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  archivedBoards: [],
  columns: [],
  members: [],
  activeBoard: null,
  pendingInvitations: [],
  comments: [],

  setActiveBoard: (board) => set({ activeBoard: board }),

  // ─── Boards ──────────────────────────────────────────────────────────────

  fetchBoards: async () => {
    const { data } = await api.get<Board[]>("/boards");
    set({ boards: data });
    return data;
  },

  createBoard: async (title, initialSprint, teamId, aiColumns, projectId) => {
    const body: Record<string, unknown> = { title };
    if (initialSprint) body.initial_sprint = initialSprint;
    if (teamId) body.team_id = teamId;
    if (aiColumns) body.ai_columns = aiColumns;
    if (projectId) body.project_id = projectId;
    const { data } = await api.post<Board>("/boards", body);
    set((s) => ({ boards: [...s.boards, data] }));
    return data;
  },

  updateBoard: async (id, title) => {
    await api.put(`/boards/${id}`, { title });
    set((s) => ({ boards: s.boards.map((b) => b.id === id ? { ...b, title } : b) }));
  },

  deleteBoard: async (id) => {
    await api.delete(`/boards/${id}`);
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }));
  },

  fetchArchivedBoards: async () => {
    const { data } = await api.get<Board[]>("/boards/archived");
    set({ archivedBoards: data });
  },

  archiveBoard: async (id) => {
    await api.patch(`/boards/${id}/archive`);
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }));
  },

  unarchiveBoard: async (id) => {
    await api.patch(`/boards/${id}/unarchive`);
    const { data } = await api.get<Board[]>("/boards");
    set((s) => ({
      archivedBoards: s.archivedBoards.filter((b) => b.id !== id),
      boards: data,
    }));
  },

  // ─── Columns ─────────────────────────────────────────────────────────────

  fetchColumns: async (boardId) => {
    set({ columns: [] });
    const { data } = await api.get<Column[]>(`/boards/${boardId}/columns`);
    const withNormalizedCards = data.map((col) => ({
      ...col,
      cards: _normalizePositions(col.cards ?? []),
    }));
    set({ columns: _normalizePositions(withNormalizedCards) });
  },

  createColumn: async (boardId, title) => {
    const cols = get().columns;
    const lastPos = cols.length > 0 ? cols[cols.length - 1].position : null;
    const position = generateKeyBetween(lastPos, null);
    const { data } = await api.post<Column>(`/boards/${boardId}/columns`, { title, position });
    set((s) => ({ columns: [...s.columns, data] }));
  },

  deleteColumn: async (columnId) => {
    await api.delete(`/columns/${columnId}`);
    set((s) => ({ columns: s.columns.filter((c) => c.id !== columnId) }));
  },

  renameColumn: async (columnId, title) => {
    await api.put(`/columns/${columnId}`, { title });
    set((s) => ({
      columns: s.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  },

  // ─── Cards ───────────────────────────────────────────────────────────────

  createCard: async (columnId, title) => {
    const col = get().columns.find((c) => c.id === columnId);
    const cards = col?.cards ?? [];
    const lastPos = cards.length > 0 ? cards[cards.length - 1].position : null;
    const position = generateKeyBetween(lastPos, null);
    const { data } = await api.post<Card>(`/columns/${columnId}/cards`, { title, position });
    set((s) => ({
      columns: s.columns.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, data] } : c
      ),
    }));
  },

  updateCard: async (cardId, patch) => {
    const { data } = await api.put<Card>(`/cards/${cardId}`, patch);
    set((s) => ({
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId ? { ...card, ...data } : card
        ),
      })),
    }));
  },

  deleteCard: async (cardId) => {
    await api.delete(`/cards/${cardId}`);
    set((s) => ({
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== cardId),
      })),
    }));
  },

  // ─── DnD ─────────────────────────────────────────────────────────────────

  moveCard: async (cardId, fromColumnId, toColumnId, overCardId) => {
    const cols = get().columns;

    const srcCol = cols.find((c) => c.id === fromColumnId)!;
    const card = srcCol.cards.find((c) => c.id === cardId)!;

    const destCol = cols.find((c) => c.id === toColumnId)!;
    const destCards = destCol.cards.filter((c) => c.id !== cardId);

    let prevPos: string | null = null;
    let nextPos: string | null = null;

    if (overCardId === null) {
      prevPos = destCards.length > 0 ? destCards[destCards.length - 1].position : null;
    } else {
      const overIdx = destCards.findIndex((c) => c.id === overCardId);
      if (overIdx === -1) {
        prevPos = destCards.length > 0 ? destCards[destCards.length - 1].position : null;
        nextPos = null;
      } else {
        prevPos = overIdx > 0 ? destCards[overIdx - 1].position : null;
        nextPos = destCards[overIdx]?.position ?? null;
      }
    }

    const newPosition = generateKeyBetween(prevPos, nextPos);

    set((s) => {
      const newCols = s.columns.map((col) => {
        if (col.id === fromColumnId && col.id !== toColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        if (col.id === toColumnId) {
          const withoutCard = col.cards.filter((c) => c.id !== cardId);
          const updatedCard = { ...card, column_id: toColumnId, position: newPosition };
          const newCards = [...withoutCard, updatedCard].sort((a, b) =>
            a.position < b.position ? -1 : 1
          );
          return { ...col, cards: newCards };
        }
        return col;
      });

      if (fromColumnId !== toColumnId) {
        pendingActivityMap.set(cardId, {
          id: `optimistic-${cardId}`,
          card_id: cardId,
          action: "moved",
          from_col: srcCol.title,
          to_col: destCol.title,
          from_priority: null,
          to_priority: null,
          user_name: null,
          created_at: new Date().toISOString(),
        });
      }

      return { columns: newCols };
    });

    await api.put(`/cards/${cardId}`, {
      column_id: toColumnId,
      position: newPosition,
    });
  },

  fetchMembers: async (boardId) => {
    const { data } = await api.get<BoardMember[]>(`/boards/${boardId}/members`);
    set({ members: data });
  },

  inviteMember: async (boardId, email, role = "member") => {
    const { data } = await api.post<BoardMember>(`/boards/${boardId}/members`, { email, role });
    set((s) => ({ members: [...s.members, data] }));
  },

  removeMember: async (boardId, memberId) => {
    await api.delete(`/boards/${boardId}/members/${memberId}`);
    set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
  },

  fetchPendingInvitations: async () => {
    const { data } = await api.get<BoardMember[]>("/boards/invitations");
    set({ pendingInvitations: data });
  },

  acceptInvitation: async (boardId) => {
    await api.post(`/boards/invitations/${boardId}/accept`);
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((inv) => inv.board_id !== boardId),
    }));
    const { data } = await api.get<Board[]>("/boards");
    set({ boards: data });
  },

  declineInvitation: async (boardId) => {
    await api.post(`/boards/invitations/${boardId}/decline`);
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((inv) => inv.board_id !== boardId),
    }));
  },

  // ─── Comments ────────────────────────────────────────────────────────────

  fetchComments: async (cardId) => {
    const { data } = await api.get<Comment[]>(`/cards/${cardId}/comments`);
    set({ comments: data });
  },

  addComment: async (cardId, content) => {
    const { data } = await api.post<Comment>(`/cards/${cardId}/comments`, { content });
    set((s) => ({
      comments: [...s.comments, data],
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === cardId ? { ...c, comment_count: (c.comment_count ?? 0) + 1 } : c
        ),
      })),
    }));
  },

  deleteComment: async (commentId, cardId) => {
    await api.delete(`/comments/${commentId}`);
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== commentId),
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === cardId ? { ...c, comment_count: Math.max(0, (c.comment_count ?? 1) - 1) } : c
        ),
      })),
    }));
  },

  assignCardToSprint: async (cardId, sprintId) => {
    const { data } = await api.put<Card>(`/cards/${cardId}`, { sprint_id: sprintId });
    set((s) => ({
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...data } : c)),
      })),
    }));
  },

  updateCardLabels: (cardId, labels) => {
    set((s) => ({
      columns: s.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, labels } : c)),
      })),
    }));
  },

  moveColumn: async (columnId, overColumnId) => {
    const cols = get().columns;
    const colsWithout = cols.filter((c) => c.id !== columnId);

    let prevPos: string | null = null;
    let nextPos: string | null = null;

    if (overColumnId === null) {
      prevPos = colsWithout.length > 0 ? colsWithout[colsWithout.length - 1].position : null;
    } else {
      const overIdx = colsWithout.findIndex((c) => c.id === overColumnId);
      const originalDragIdx = cols.findIndex((c) => c.id === columnId);
      const originalOverIdx = cols.findIndex((c) => c.id === overColumnId);

      if (originalDragIdx < originalOverIdx) {
        // Sağa sürükleme: hedef column'ın arkasına yerleştir
        prevPos = colsWithout[overIdx]?.position ?? null;
        nextPos = overIdx < colsWithout.length - 1 ? colsWithout[overIdx + 1].position : null;
      } else {
        // Sola sürükleme: hedef column'ın önüne yerleştir
        prevPos = overIdx > 0 ? colsWithout[overIdx - 1].position : null;
        nextPos = colsWithout[overIdx]?.position ?? null;
      }
    }

    const newPosition = generateKeyBetween(prevPos, nextPos);

    set((s) => {
      const updated = s.columns.map((c) =>
        c.id === columnId ? { ...c, position: newPosition } : c
      );
      return { columns: [...updated].sort((a, b) => (a.position < b.position ? -1 : 1)) };
    });

    await api.put(`/columns/${columnId}`, { position: newPosition });
  },
}));
