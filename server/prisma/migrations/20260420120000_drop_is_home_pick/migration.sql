-- Drop the unused is_home_pick column. The field was added earlier in the same session but the
-- per-corner HomeSectionProduct design superseded the global flag before any real data could be
-- stored. Safe to drop.
ALTER TABLE "books" DROP COLUMN IF EXISTS "is_home_pick";
