-- Migration: 014_card_labels
-- Board'a özel renkli etiketler ve kart-etiket ilişki tablosu

CREATE TABLE IF NOT EXISTS public.labels (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    color      TEXT        NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (board_id, name)
);

CREATE TABLE IF NOT EXISTS public.card_labels (
    card_id  UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);
