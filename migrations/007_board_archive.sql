-- Migration: 007_board_archive
-- Board'lara arşiv desteği ekler.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
