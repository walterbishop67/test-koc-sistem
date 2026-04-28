-- Migration: 015_fix_positions
-- Fixes single-character position values ('a', 'b', 'c'...) that are invalid
-- for the fractional-indexing library used on the frontend.
-- Valid keys must be at least 2 characters: 'a0', 'a1', ..., 'az', 'b00', etc.
-- Only rows with length(position) < 2 are updated; valid rows are untouched.

-- Fix column positions (order preserved per board)
WITH ranked AS (
  SELECT
    id,
    board_id,
    (ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY position) - 1) AS rn
  FROM columns
  WHERE length(position) < 2
)
UPDATE columns
SET position = 'a' || substr(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  (ranked.rn::int % 62) + 1,
  1
)
FROM ranked
WHERE columns.id = ranked.id;

-- Fix card positions (order preserved per column)
WITH ranked AS (
  SELECT
    id,
    column_id,
    (ROW_NUMBER() OVER (PARTITION BY column_id ORDER BY position) - 1) AS rn
  FROM cards
  WHERE length(position) < 2
)
UPDATE cards
SET position = 'a' || substr(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  (ranked.rn::int % 62) + 1,
  1
)
FROM ranked
WHERE cards.id = ranked.id;
