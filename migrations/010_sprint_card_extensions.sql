-- Migration: 010_sprint_card_extensions
-- Kartlara bitiş tarihi ve sprint ataması ekler.

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL;
