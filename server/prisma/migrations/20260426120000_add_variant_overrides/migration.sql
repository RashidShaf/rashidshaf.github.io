-- Add nullable per-variant overrides. Null = "inherit from base book".
ALTER TABLE "product_variants" ADD COLUMN "dimensions" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "weight" DECIMAL(6,2);
ALTER TABLE "product_variants" ADD COLUMN "brand" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "brand_ar" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "material" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "material_ar" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "age_range" TEXT;
