-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_book_id_fkey";

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "book_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
