-- Migration: 002_create_core_tables
-- Uygulama tablolarını oluşturur. IF NOT EXISTS sayesinde kısmi kurulumlar güvenli.

-- public.users migration 001'de oluşturulur; burada yalnızca diğer tablolar.

CREATE TABLE IF NOT EXISTS public.boards (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title      TEXT        NOT NULL,
    owner_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_members (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id      UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    user_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    invited_email TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'member',
    status        TEXT        NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (board_id, invited_email)
);

CREATE TABLE IF NOT EXISTS public.columns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    position   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cards (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id   UUID        NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    position    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
