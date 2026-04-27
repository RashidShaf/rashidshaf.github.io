-- Per-variant custom field overrides. Same JSON shape as Book.customFields.
ALTER TABLE "product_variants" ADD COLUMN "custom_fields" TEXT;
