-- Migration: 006_team_members_status
-- team_members tablosuna status ve user_id sütunları ekler.
-- Mevcut kayıtlar 'accepted' olarak korunur; yeni davetler 'pending' başlar.

ALTER TABLE public.team_members
    ADD COLUMN IF NOT EXISTS status  TEXT NOT NULL DEFAULT 'accepted',
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Mevcut üyeler için user_id backfill
UPDATE public.team_members tm
SET user_id = u.id
FROM public.users u
WHERE tm.email = u.email
  AND tm.user_id IS NULL;

-- Yeni davetler artık pending başlasın
ALTER TABLE public.team_members
    ALTER COLUMN status SET DEFAULT 'pending';
