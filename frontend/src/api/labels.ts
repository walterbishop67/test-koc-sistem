import { api } from "./client";
import type { Label } from "../types";

export const getLabels = (boardId: string) =>
  api.get<Label[]>(`/boards/${boardId}/labels`).then((r) => r.data);

export const createLabel = (boardId: string, name: string, color: string) =>
  api.post<Label>(`/boards/${boardId}/labels`, { name, color }).then((r) => r.data);

export const deleteLabel = (labelId: string) =>
  api.delete(`/labels/${labelId}`);

export const updateLabel = (labelId: string, name?: string, color?: string) =>
  api.patch<Label>(`/labels/${labelId}`, { name, color }).then((r) => r.data);

export const addLabelToCard = (cardId: string, labelId: string) =>
  api.post(`/cards/${cardId}/labels/${labelId}`);

export const removeLabelFromCard = (cardId: string, labelId: string) =>
  api.delete(`/cards/${cardId}/labels/${labelId}`);
