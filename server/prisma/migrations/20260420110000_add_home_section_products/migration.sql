-- CreateTable
CREATE TABLE "home_section_products" (
    "id" TEXT NOT NULL,
    "corner_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "home_section_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_section_products_corner_id_book_id_key" ON "home_section_products"("corner_id", "book_id");

-- CreateIndex
CREATE INDEX "home_section_products_corner_id_idx" ON "home_section_products"("corner_id");

-- AddForeignKey
ALTER TABLE "home_section_products" ADD CONSTRAINT "home_section_products_corner_id_fkey" FOREIGN KEY ("corner_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_section_products" ADD CONSTRAINT "home_section_products_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
