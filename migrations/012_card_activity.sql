-- Migration: 012_card_activity
-- Kart hareket geçmişi tablosu: oluşturma ve sütun taşıma olaylarını kaydeder.

CREATE TABLE IF NOT EXISTS public.card_activities (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID        NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    action     TEXT        NOT NULL,   -- 'created' | 'moved'
    from_col   TEXT,                   -- kaynak sütun başlığı (moved için)
    to_col     TEXT,                   -- hedef sütun başlığı
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_activities_card_id
    ON public.card_activities(card_id);
