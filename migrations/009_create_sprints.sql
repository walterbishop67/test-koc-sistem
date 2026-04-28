-- Migration: 009_create_sprints
-- Board'lara Jira benzeri sprint desteği ekler.

CREATE TABLE IF NOT EXISTS public.sprints (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    goal       TEXT,
    start_date DATE,
    end_date   DATE,
    state      TEXT        NOT NULL DEFAULT 'future',  -- future | active | completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
