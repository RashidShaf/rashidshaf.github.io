-- Make AdGridTile.image nullable so admin can clear an image (via the X button)
-- while keeping the tile's metadata (link, titles, position). Storefront still
-- filters out tiles where image is null so they don't render.
ALTER TABLE "ad_grid_tiles" ALTER COLUMN "image" DROP NOT NULL;
