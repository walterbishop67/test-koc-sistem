-- Migration: 003_card_priority_assignee
-- Kartlara öncelik ve atama alanları ekler.

ALTER TABLE public.cards
    ADD COLUMN IF NOT EXISTS priority      TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    ADD COLUMN IF NOT EXISTS assignee_email TEXT;
