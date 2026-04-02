-- CreateTable
CREATE TABLE "book_categories" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_categories_book_id_idx" ON "book_categories"("book_id");

-- CreateIndex
CREATE INDEX "book_categories_category_id_idx" ON "book_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_categories_book_id_category_id_key" ON "book_categories"("book_id", "category_id");

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
