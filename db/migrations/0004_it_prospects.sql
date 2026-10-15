-- IT Prospects: a separate area for companies that pay for software work (open developer roles, project posts, tenders),
-- digital agencies and IT firms (white-label partners), and businesses with a visible IT need. Nothing here touches the
-- leads, the lead finder or any table before this file. Design: docs/superpowers/specs/2026-10-15-it-prospects-design.md.

CREATE TABLE it_prospects (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  owner           VARCHAR(30) NOT NULL,
  assignee        VARCHAR(30) NULL,
  segment         VARCHAR(16) NOT NULL,
  company         VARCHAR(255) NOT NULL,
  company_domain  VARCHAR(255) NOT NULL DEFAULT '',
  website_url     VARCHAR(1000) NOT NULL DEFAULT '',
  linkedin_url    VARCHAR(1000) NOT NULL DEFAULT '',
  contact_name    VARCHAR(200) NOT NULL DEFAULT '',
  contact_title   VARCHAR(200) NOT NULL DEFAULT '',
  email           VARCHAR(255) NOT NULL DEFAULT '',
  phone           VARCHAR(100) NOT NULL DEFAULT '',
  whatsapp        VARCHAR(300) NOT NULL DEFAULT '',
  city            VARCHAR(200) NOT NULL DEFAULT '',
  region          VARCHAR(10) NOT NULL DEFAULT '',
  country         CHAR(2) NOT NULL DEFAULT 'US',
  team_size       VARCHAR(16) NOT NULL DEFAULT '',
  maps_url        VARCHAR(1000) NOT NULL DEFAULT '',
  maps_category   VARCHAR(200) NOT NULL DEFAULT '',
  rating          DOUBLE NULL,
  review_count    BIGINT NULL,
  stage           VARCHAR(16) NOT NULL,
  qualifier       JSON NOT NULL,
  notes           TEXT NOT NULL,
  source          VARCHAR(16) NOT NULL,
  created_at      DATETIME(3) NOT NULL,
  updated_at      DATETIME(3) NOT NULL,
  KEY it_prospects_owner (owner, stage),
  KEY it_prospects_assignee (assignee),
  CONSTRAINT fk_it_prospects_owner FOREIGN KEY (owner) REFERENCES users (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- The duplicate guard for prospects: company domain, email, phone digits, Maps place, name + city. No two prospects share a key.
CREATE TABLE it_keys (
  key_value    VARCHAR(700) NOT NULL PRIMARY KEY,
  prospect_id  CHAR(36) NOT NULL,
  KEY it_keys_prospect (prospect_id),
  CONSTRAINT fk_it_keys_prospect FOREIGN KEY (prospect_id) REFERENCES it_prospects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Buying signals: the public post, tender or launch that is the reason to get in touch. Many per prospect.
CREATE TABLE it_signals (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  prospect_id  CHAR(36) NOT NULL,
  signal_type  VARCHAR(20) NOT NULL,
  url          VARCHAR(1000) NOT NULL DEFAULT '',
  quote        TEXT NOT NULL,
  signal_date  DATE NULL,
  source       VARCHAR(40) NOT NULL DEFAULT '',
  added_by     VARCHAR(30) NOT NULL,
  created_at   DATETIME(3) NOT NULL,
  KEY it_signals_prospect (prospect_id, signal_date),
  CONSTRAINT fk_it_signals_prospect FOREIGN KEY (prospect_id) REFERENCES it_prospects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- History: created, stage moves, assignments, signals, comments. Append-only; deleting a prospect deletes its history.
CREATE TABLE it_events (
  seq          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id           CHAR(36) NOT NULL,
  prospect_id  CHAR(36) NOT NULL,
  by_user      VARCHAR(30) NOT NULL,
  kind         VARCHAR(16) NOT NULL,
  from_stage   VARCHAR(16) NULL,
  to_stage     VARCHAR(16) NULL,
  note         TEXT NOT NULL,
  created_at   DATETIME(3) NOT NULL,
  KEY it_events_prospect (prospect_id, seq),
  CONSTRAINT fk_it_events_prospect FOREIGN KEY (prospect_id) REFERENCES it_prospects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- The IT finder: the same Google Maps scraper as the lead finder, saving into its own tables.
CREATE TABLE it_finder_runs (
  id                CHAR(36) NOT NULL PRIMARY KEY,
  owner             VARCHAR(30) NOT NULL,
  started_at        DATETIME(3) NOT NULL,
  query             VARCHAR(300) NOT NULL,
  category          VARCHAR(200) NOT NULL,
  city              VARCHAR(200) NOT NULL,
  state             VARCHAR(10) NOT NULL,
  run_limit         INT NOT NULL,
  finished_at       DATETIME(3) NULL,
  found             INT NULL,
  checked           INT NULL,
  skipped_duplicate INT NULL,
  saved             INT NULL,
  stop_reason       VARCHAR(500) NULL,
  KEY it_finder_runs_owner (owner, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE it_finder_businesses (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  owner           VARCHAR(30) NOT NULL,
  place_key       VARCHAR(512) NOT NULL,
  scraped_on      DATE NOT NULL,
  scraped_at      DATETIME(3) NOT NULL,
  run_id          CHAR(36) NULL,
  query           VARCHAR(300) NOT NULL,
  category        VARCHAR(200) NOT NULL,
  city            VARCHAR(200) NOT NULL,
  state           VARCHAR(10) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(60) NOT NULL DEFAULT '',
  address         VARCHAR(500) NOT NULL DEFAULT '',
  maps_category   VARCHAR(200) NOT NULL DEFAULT '',
  rating          DOUBLE NULL,
  review_count    BIGINT NULL,
  email           VARCHAR(255) NOT NULL DEFAULT '',
  facebook_url    VARCHAR(500) NOT NULL DEFAULT '',
  instagram_url   VARCHAR(500) NOT NULL DEFAULT '',
  other_links     JSON NOT NULL,
  maps_url        VARCHAR(1000) NOT NULL DEFAULT '',
  has_website     TINYINT(1) NOT NULL DEFAULT 0,
  website_url     VARCHAR(1000) NOT NULL DEFAULT '',
  whatsapp        VARCHAR(300) NOT NULL DEFAULT '',
  prospect_id     CHAR(36) NULL,
  added_at        DATETIME(3) NULL,
  KEY it_finder_businesses_day (owner, scraped_on),
  KEY it_finder_businesses_search (owner, category, city, state),
  KEY it_finder_businesses_place (place_key(190))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE it_finder_keys (
  key_value    VARCHAR(700) NOT NULL PRIMARY KEY,
  business_id  CHAR(36) NOT NULL,
  KEY it_finder_keys_business (business_id),
  CONSTRAINT fk_it_finder_keys_business FOREIGN KEY (business_id) REFERENCES it_finder_businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
