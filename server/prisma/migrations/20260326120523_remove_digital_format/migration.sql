/*
  Warnings:

  - You are about to drop the column `digital_file_size` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `digital_file_url` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `preview_file_url` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `preview_pages` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `order_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,book_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "books_format_idx";

-- DropIndex
DROP INDEX "cart_items_user_id_book_id_format_key";

-- AlterTable
ALTER TABLE "books" DROP COLUMN "digital_file_size",
DROP COLUMN "digital_file_url",
DROP COLUMN "format",
DROP COLUMN "preview_file_url",
DROP COLUMN "preview_pages";

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "format";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "format";

-- DropEnum
DROP TYPE "BookFormat";

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_book_id_key" ON "cart_items"("user_id", "book_id");
