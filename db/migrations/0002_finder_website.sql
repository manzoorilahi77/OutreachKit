-- The lead finder now keeps every business it finds, with or without a website.
-- Rows saved before this migration all had no website, which is what the default says.
ALTER TABLE finder_businesses
  ADD COLUMN has_website TINYINT(1) NOT NULL DEFAULT 0 AFTER maps_url,
  ADD COLUMN website_url VARCHAR(1000) NOT NULL DEFAULT '' AFTER has_website;
