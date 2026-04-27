-- Per-variant book-specific overrides. All nullable — null inherits from base.
ALTER TABLE "product_variants" ADD COLUMN "author" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "author_ar" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "publisher" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "publisher_ar" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "isbn" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "pages" INTEGER;
ALTER TABLE "product_variants" ADD COLUMN "language" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "published_date" TIMESTAMP(3);
