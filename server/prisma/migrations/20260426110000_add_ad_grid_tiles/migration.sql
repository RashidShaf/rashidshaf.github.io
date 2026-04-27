-- CreateTable
CREATE TABLE "ad_grid_tiles" (
    "id" TEXT NOT NULL,
    "corner_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "book_id" TEXT,
    "external_link" TEXT,
    "title" TEXT,
    "title_ar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_grid_tiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_grid_tiles_corner_id_position_key"
    ON "ad_grid_tiles"("corner_id", "position");

CREATE INDEX "ad_grid_tiles_corner_id_idx" ON "ad_grid_tiles"("corner_id");

ALTER TABLE "ad_grid_tiles"
    ADD CONSTRAINT "ad_grid_tiles_corner_id_fkey"
    FOREIGN KEY ("corner_id") REFERENCES "categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ad_grid_tiles"
    ADD CONSTRAINT "ad_grid_tiles_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "books"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
