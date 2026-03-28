-- AlterTable
ALTER TABLE "books" ADD COLUMN     "is_coming_soon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_trending" BOOLEAN NOT NULL DEFAULT false;
