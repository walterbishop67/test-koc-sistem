-- Migration: 008_card_comments
-- Kartlara yorum ekleme özelliği için tablo.

CREATE TABLE IF NOT EXISTS public.card_comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID        NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON public.card_comments(card_id);
