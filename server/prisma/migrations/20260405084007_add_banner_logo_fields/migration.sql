-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "logo_position" TEXT NOT NULL DEFAULT 'center-left',
ADD COLUMN     "show_logo" BOOLEAN NOT NULL DEFAULT true;
