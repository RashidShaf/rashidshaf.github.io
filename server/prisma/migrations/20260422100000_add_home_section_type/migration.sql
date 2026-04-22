-- Drop old unique constraint on (corner_id, book_id)
ALTER TABLE "home_section_products" DROP CONSTRAINT IF EXISTS "home_section_products_corner_id_book_id_key";
DROP INDEX IF EXISTS "home_section_products_corner_id_book_id_key";

-- Add section_type column with default so existing rows get 'featured'
ALTER TABLE "home_section_products" ADD COLUMN "section_type" TEXT NOT NULL DEFAULT 'featured';

-- New unique constraint across (corner_id, section_type, book_id)
CREATE UNIQUE INDEX "home_section_products_corner_id_section_type_book_id_key" ON "home_section_products"("corner_id", "section_type", "book_id");

-- Drop old single-column index and replace with composite index
DROP INDEX IF EXISTS "home_section_products_corner_id_idx";
CREATE INDEX "home_section_products_corner_id_section_type_idx" ON "home_section_products"("corner_id", "section_type");
