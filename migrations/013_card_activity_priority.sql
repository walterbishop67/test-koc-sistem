-- Migration: 013_card_activity_priority
-- Kart öncelik değişimini card_activities tablosuna ekler.

ALTER TABLE public.card_activities
    ADD COLUMN IF NOT EXISTS from_priority TEXT,
    ADD COLUMN IF NOT EXISTS to_priority   TEXT;

-- action alanı artık 'created' | 'moved' | 'priority_changed' değerlerini alır.
