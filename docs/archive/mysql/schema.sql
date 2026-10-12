-- Local lead finder: businesses found on Google Maps that show no website. Local MySQL only; Supabase never sees this.
-- `pnpm mysql:init` creates the database named in MYSQL_URL, then runs this file. Safe to run again.

CREATE TABLE IF NOT EXISTS scrape_runs (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  started_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at          DATETIME NULL,
  query                VARCHAR(300) NOT NULL,
  category             VARCHAR(120) NOT NULL,
  city                 VARCHAR(120) NOT NULL,
  state                CHAR(2) NOT NULL,
  -- "limit" is a reserved word in SQL, so the day's ceiling is stored as run_limit
  run_limit            INT UNSIGNED NOT NULL,
  found                INT UNSIGNED NOT NULL DEFAULT 0,
  checked              INT UNSIGNED NOT NULL DEFAULT 0,
  skipped_has_website  INT UNSIGNED NOT NULL DEFAULT 0,
  skipped_duplicate    INT UNSIGNED NOT NULL DEFAULT 0,
  saved                INT UNSIGNED NOT NULL DEFAULT 0,
  stop_reason          VARCHAR(500) NULL,
  KEY runs_started_idx (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scraped_businesses (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  -- The duplicate key: the Maps feature id (fid:0x…:0x…), else place id, cid or place path. See src/lib/scrape/placeKey.ts.
  place_key        VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  -- The local calendar day the row was saved (the app writes it; the daily limit is counted on it).
  scraped_on       DATE NOT NULL,
  scraped_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  run_id           BIGINT UNSIGNED NULL,
  query            VARCHAR(300) NOT NULL,
  category         VARCHAR(120) NOT NULL,
  city             VARCHAR(120) NOT NULL,
  state            CHAR(2) NOT NULL,
  business_name    VARCHAR(255) NOT NULL,
  phone            VARCHAR(60) NOT NULL DEFAULT '',
  address          VARCHAR(500) NOT NULL DEFAULT '',
  google_maps_url  VARCHAR(1000) NOT NULL,
  maps_category    VARCHAR(200) NOT NULL DEFAULT '',
  rating           DECIMAL(2,1) NULL,
  review_count     INT UNSIGNED NULL,
  email            VARCHAR(255) NOT NULL DEFAULT '',
  facebook_url     VARCHAR(500) NOT NULL DEFAULT '',
  instagram_url    VARCHAR(500) NOT NULL DEFAULT '',
  -- Other social and booking links the listing showed: [{"label": "...", "url": "..."}]
  other_links      JSON NULL,
  -- The Supabase leads.id this row was copied to, once moved.
  moved_lead_id    CHAR(36) NULL,
  moved_at         DATETIME NULL,
  UNIQUE KEY uq_place_key (place_key),
  KEY by_day_idx (scraped_on),
  KEY by_search_idx (category, city, state, id),
  CONSTRAINT fk_business_run FOREIGN KEY (run_id) REFERENCES scrape_runs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
