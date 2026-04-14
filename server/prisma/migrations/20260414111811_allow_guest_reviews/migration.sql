-- DropIndex
DROP INDEX "reviews_user_id_book_id_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "guest_name" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;
