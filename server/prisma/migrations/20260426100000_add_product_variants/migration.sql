-- Add hasVariants flag to books
ALTER TABLE "books" ADD COLUMN "has_variants" BOOLEAN NOT NULL DEFAULT false;

-- Create product_variants table
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "label_ar" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "purchase_price" DECIMAL(10,2),
    "compare_at_price" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "color" TEXT,
    "color_ar" TEXT,
    "image" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_out_of_stock" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_book_id_idx" ON "product_variants"("book_id");
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cart items: add variant_id + variant_key, replace unique
ALTER TABLE "cart_items" ADD COLUMN "variant_id" TEXT;
ALTER TABLE "cart_items" ADD COLUMN "variant_key" TEXT NOT NULL DEFAULT '';

ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_user_id_book_id_key";
DROP INDEX IF EXISTS "cart_items_user_id_book_id_key";

CREATE UNIQUE INDEX "cart_items_user_id_book_id_variant_key_key"
    ON "cart_items"("user_id", "book_id", "variant_key");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order items: add variant snapshot fields
ALTER TABLE "order_items" ADD COLUMN "variant_id" TEXT;
ALTER TABLE "order_items" ADD COLUMN "variant_label" TEXT;
ALTER TABLE "order_items" ADD COLUMN "variant_sku" TEXT;
ALTER TABLE "order_items" ADD COLUMN "variant_color" TEXT;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inventory log: add variant_id
ALTER TABLE "inventory_logs" ADD COLUMN "variant_id" TEXT;

CREATE INDEX "inventory_logs_variant_id_idx" ON "inventory_logs"("variant_id");

ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
