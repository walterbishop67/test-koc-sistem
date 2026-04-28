-- boards tablosuna monoton artan sayaç
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS next_card_number INTEGER NOT NULL DEFAULT 1;

-- cards tablosuna sıra numarası
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_number INTEGER;

-- Atomik atama için Postgres trigger
CREATE OR REPLACE FUNCTION assign_card_number()
RETURNS TRIGGER AS $$
DECLARE
  board_id_val UUID;
  next_num     INTEGER;
BEGIN
  SELECT board_id INTO board_id_val
  FROM public.columns
  WHERE id = NEW.column_id;

  UPDATE public.boards
  SET next_card_number = next_card_number + 1
  WHERE id = board_id_val
  RETURNING next_card_number - 1 INTO next_num;

  NEW.card_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assign_card_number
BEFORE INSERT ON public.cards
FOR EACH ROW EXECUTE FUNCTION assign_card_number();

-- Mevcut kartları backfill et (created_at sırasına göre, board başına)
DO $$
DECLARE
  rec          RECORD;
  board_id_val UUID := NULL;
  counter      INTEGER := 1;
BEGIN
  FOR rec IN
    SELECT c.id, col.board_id, c.created_at
    FROM public.cards c
    JOIN public.columns col ON col.id = c.column_id
    ORDER BY col.board_id, c.created_at
  LOOP
    IF board_id_val IS NULL OR rec.board_id != board_id_val THEN
      board_id_val := rec.board_id;
      counter := 1;
    END IF;
    UPDATE public.cards SET card_number = counter WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;

  -- next_card_number'ı mevcut max + 1'e ayarla
  UPDATE public.boards b
  SET next_card_number = COALESCE(
    (SELECT MAX(c.card_number) + 1
     FROM public.cards c
     JOIN public.columns col ON col.id = c.column_id
     WHERE col.board_id = b.id),
    1
  );
END $$;
