-- Migration: 001_auth_user_trigger
-- 1. public.users tablosunu oluştur (auth.users için mirror tablo)
-- 2. Yeni auth kullanıcılarını otomatik olarak public.users'a ekleyen trigger
-- 3. Mevcut auth kullanıcıları için backfill

-- 1. Tablo
CREATE TABLE IF NOT EXISTS public.users (
    id            UUID        PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    full_name     TEXT,
    password_hash TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, password_hash)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '$supabase-auth$placeholder'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Trigger: auth.users INSERT → handle_new_user()
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: daha önce kayıt olmuş ama public.users'da satırı olmayan kullanıcılar
INSERT INTO public.users (id, email, full_name, password_hash)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  '$supabase-auth$placeholder'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
