-- Outreach Kit: the first schema. MySQL 8.0 or newer, utf8mb4.
-- Every table compares text exactly (utf8mb4_bin), like the app does; the few case-insensitive lookups use LOWER().
-- Timestamps are UTC DATETIME(3); dates are DATE. The app reads and writes both as ISO strings.
-- Shapes follow src/lib/store/schemas.ts. Column names keep the old lead/kit/event names.

CREATE TABLE workspace (
  id                     TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  name                   TEXT NOT NULL,
  studio                 TEXT NOT NULL,
  demo_domain            VARCHAR(255) NOT NULL,
  based_line             TEXT NOT NULL,
  feature_lead_finder    TINYINT(1) NOT NULL DEFAULT 1,
  feature_software_track TINYINT(1) NOT NULL DEFAULT 0,
  rate_cad               DOUBLE NULL,
  rate_aed               DOUBLE NULL,
  outreach_health        JSON NULL,
  updated_at             DATETIME(3) NOT NULL,
  CONSTRAINT workspace_one_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE teams (
  id        VARCHAR(40) NOT NULL PRIMARY KEY,
  name      VARCHAR(200) NOT NULL,
  position  INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE team_managers (
  team_id   VARCHAR(40) NOT NULL,
  username  VARCHAR(30) NOT NULL,
  position  INT NOT NULL,
  PRIMARY KEY (team_id, username),
  CONSTRAINT fk_team_managers_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE users (
  username            VARCHAR(30) NOT NULL PRIMARY KEY,
  full_name           VARCHAR(200) NOT NULL,
  role                VARCHAR(20) NOT NULL,
  team                VARCHAR(40) NULL,
  status              ENUM('active','suspended','disabled') NOT NULL DEFAULT 'active',
  status_reason       VARCHAR(500) NOT NULL DEFAULT '',
  suspended_until     DATE NULL,
  temp_password_hash  VARCHAR(255) NOT NULL,
  rev                 INT UNSIGNED NOT NULL DEFAULT 1,
  pw_rev              INT UNSIGNED NOT NULL DEFAULT 1,
  created_by          VARCHAR(30) NOT NULL,
  created_at          DATETIME(3) NOT NULL,
  updated_at          DATETIME(3) NOT NULL,
  KEY users_role (role),
  KEY users_team (team)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE profiles (
  username         VARCHAR(30) NOT NULL PRIMARY KEY,
  default_device   ENUM('desktop','mobile') NOT NULL DEFAULT 'desktop',
  password_hash    VARCHAR(255) NULL,
  based_on_rev     INT UNSIGNED NULL,
  outreach_health  JSON NULL,
  CONSTRAINT fk_profiles_user FOREIGN KEY (username) REFERENCES users (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE user_signins (
  username     VARCHAR(30) NOT NULL PRIMARY KEY,
  signed_in_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE signin_failures (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username_key VARCHAR(64) NOT NULL,
  failed_at    DATETIME(3) NOT NULL,
  KEY signin_failures_lookup (username_key, failed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE kits (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  owner         VARCHAR(30) NOT NULL,
  title         VARCHAR(160) NOT NULL,
  status        ENUM('draft','active','paused','archived') NOT NULL,
  category      VARCHAR(200) NOT NULL,
  device        ENUM('desktop','mobile') NOT NULL,
  state         VARCHAR(10) NOT NULL,
  city          VARCHAR(200) NOT NULL,
  city_is_free  TINYINT(1) NOT NULL,
  direction     VARCHAR(100) NOT NULL,
  site_lang     VARCHAR(5) NULL,
  created_at    DATETIME(3) NOT NULL,
  updated_at    DATETIME(3) NOT NULL,
  KEY kits_owner (owner, created_at),
  CONSTRAINT fk_kits_owner FOREIGN KEY (owner) REFERENCES users (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE leads (
  id                    CHAR(36) NOT NULL PRIMARY KEY,
  owner                 VARCHAR(30) NOT NULL,
  assigned_to           VARCHAR(30) NULL,
  source_owner          VARCHAR(30) NULL,
  source_id             CHAR(36) NULL,
  kit_id                CHAR(36) NULL,
  date_sourced          DATE NOT NULL,
  business_name         VARCHAR(255) NOT NULL,
  owner_first_name      VARCHAR(200) NOT NULL DEFAULT '',
  category              VARCHAR(200) NOT NULL,
  city                  VARCHAR(200) NOT NULL,
  state                 VARCHAR(10) NOT NULL,
  phone                 VARCHAR(100) NOT NULL DEFAULT '',
  email                 VARCHAR(255) NOT NULL DEFAULT '',
  instagram_handle      VARCHAR(255) NOT NULL DEFAULT '',
  facebook_page         VARCHAR(500) NOT NULL DEFAULT '',
  google_maps_url       VARCHAR(1000) NOT NULL DEFAULT '',
  website_found         TINYINT(1) NULL,
  website_url           VARCHAR(1000) NOT NULL DEFAULT '',
  site_verdict          VARCHAR(500) NOT NULL DEFAULT '',
  google_review_count   BIGINT NULL,
  google_rating         DOUBLE NULL,
  followers             BIGINT NULL,
  last_post_date        DATE NULL,
  demo_url              VARCHAR(1000) NOT NULL DEFAULT '',
  demo_built_date       DATE NULL,
  first_contact_date    DATE NULL,
  channel               VARCHAR(20) NULL,
  replied               TINYINT(1) NOT NULL DEFAULT 0,
  stage                 VARCHAR(20) NOT NULL,
  next_action_date      DATE NULL,
  notes                 TEXT NOT NULL,
  sequence_step         INT NOT NULL DEFAULT 0,
  check_no_real_website TINYINT(1) NOT NULL DEFAULT 0,
  check_owner_run       TINYINT(1) NOT NULL DEFAULT 0,
  check_active_30_days  TINYINT(1) NOT NULL DEFAULT 0,
  check_older_3_months  TINYINT(1) NOT NULL DEFAULT 0,
  check_in_radius       TINYINT(1) NOT NULL DEFAULT 0,
  check_job_value_fits  TINYINT(1) NOT NULL DEFAULT 0,
  check_reviews_5_to_200 TINYINT(1) NOT NULL DEFAULT 0,
  check_reachable       TINYINT(1) NOT NULL DEFAULT 0,
  check_demand_signal   TINYINT(1) NOT NULL DEFAULT 0,
  check_second_channel  TINYINT(1) NOT NULL DEFAULT 0,
  created_at            DATETIME(3) NOT NULL,
  updated_at            DATETIME(3) NOT NULL,
  KEY leads_owner_stage (owner, stage),
  KEY leads_assigned (assigned_to),
  KEY leads_source (source_owner, source_id),
  CONSTRAINT fk_leads_owner FOREIGN KEY (owner) REFERENCES users (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- The duplicate guard. A lead answers to up to three keys (Maps place, phone digits, name + city), and no two live leads
-- may share one. `live` is 1, or NULL once an accepted copy has replaced the lead: MySQL lets a unique key hold many NULLs,
-- so a replaced lead frees its keys, and gets them back if the copy is deleted.
CREATE TABLE lead_keys (
  lead_id    CHAR(36) NOT NULL,
  key_value  VARCHAR(700) NOT NULL,
  live       TINYINT UNSIGNED NULL DEFAULT 1,
  PRIMARY KEY (lead_id, key_value),
  UNIQUE KEY lead_keys_live (key_value, live),
  CONSTRAINT fk_lead_keys_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Append-only. `seq` keeps the order things were written in. No foreign key to leads: deleting a lead leaves its events.
CREATE TABLE lead_events (
  seq         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id          CHAR(36) NOT NULL,
  lead_owner  VARCHAR(30) NOT NULL,
  lead_id     CHAR(36) NOT NULL,
  by_user     VARCHAR(30) NOT NULL,
  kind        ENUM('stage_change','touch','comment') NOT NULL,
  from_stage  VARCHAR(20) NULL,
  to_stage    VARCHAR(20) NULL,
  channel     VARCHAR(40) NULL,
  occurred_on DATE NOT NULL,
  note        TEXT NOT NULL,
  created_at  DATETIME(3) NOT NULL,
  UNIQUE KEY lead_events_id (id),
  KEY lead_events_lead (lead_owner, lead_id),
  KEY lead_events_by (by_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE assignments (
  seq         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id          CHAR(36) NOT NULL,
  kind        ENUM('assign','handover') NOT NULL,
  by_user     VARCHAR(30) NOT NULL,
  lead_owner  VARCHAR(30) NOT NULL,
  lead_id     CHAR(36) NOT NULL,
  business    VARCHAR(255) NOT NULL,
  to_user     VARCHAR(30) NOT NULL,
  at          DATETIME(3) NOT NULL,
  UNIQUE KEY assignments_id (id),
  KEY assignments_lead (lead_owner, lead_id, at),
  KEY assignments_to (to_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE audit_log (
  seq     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id      CHAR(36) NOT NULL,
  at      DATETIME(3) NOT NULL,
  actor   VARCHAR(30) NOT NULL,
  action  VARCHAR(80) NOT NULL,
  target  VARCHAR(255) NOT NULL,
  detail  TEXT NOT NULL,
  UNIQUE KEY audit_log_id (id),
  KEY audit_log_at (at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE playbook_reads (
  username    VARCHAR(30) NOT NULL,
  section_id  VARCHAR(80) NOT NULL,
  read_at     DATETIME(3) NOT NULL,
  PRIMARY KEY (username, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE playbook_required (
  username    VARCHAR(30) NOT NULL,
  section_id  VARCHAR(80) NOT NULL,
  PRIMARY KEY (username, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE approvals (
  seq          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id           CHAR(36) NOT NULL,
  owner        VARCHAR(30) NOT NULL,
  kind         ENUM('category-kit','segment') NOT NULL,
  file_id      VARCHAR(120) NOT NULL,
  version      VARCHAR(40) NOT NULL,
  approved_at  DATETIME(3) NOT NULL,
  note         TEXT NOT NULL,
  UNIQUE KEY approvals_id (id),
  KEY approvals_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE finder_runs (
  id                    CHAR(36) NOT NULL PRIMARY KEY,
  owner                 VARCHAR(30) NOT NULL,
  started_at            DATETIME(3) NOT NULL,
  query                 VARCHAR(300) NOT NULL,
  category              VARCHAR(200) NOT NULL,
  city                  VARCHAR(200) NOT NULL,
  state                 VARCHAR(10) NOT NULL,
  run_limit             INT NOT NULL,
  finished_at           DATETIME(3) NULL,
  found                 INT NULL,
  checked               INT NULL,
  skipped_has_website   INT NULL,
  skipped_duplicate     INT NULL,
  saved                 INT NULL,
  stop_reason           VARCHAR(500) NULL,
  KEY finder_runs_owner (owner, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE finder_businesses (
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
  moved_lead_id   VARCHAR(64) NULL,
  moved_at        DATETIME(3) NULL,
  KEY finder_businesses_day (owner, scraped_on),
  KEY finder_businesses_search (owner, category, city, state),
  KEY finder_businesses_place (place_key(190))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- The finder's duplicate guard: one row per key of every saved business, whoever saved it.
CREATE TABLE business_keys (
  key_value    VARCHAR(700) NOT NULL PRIMARY KEY,
  business_id  CHAR(36) NOT NULL,
  KEY business_keys_business (business_id),
  CONSTRAINT fk_business_keys_business FOREIGN KEY (business_id) REFERENCES finder_businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
