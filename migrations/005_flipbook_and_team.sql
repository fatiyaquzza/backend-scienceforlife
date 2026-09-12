-- Additive and idempotent migration for the ILMANA flipbook and dynamic team features.

SET @has_material_layout = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modules' AND COLUMN_NAME = 'material_layout'
);
SET @sql = IF(
  @has_material_layout = 0,
  "ALTER TABLE modules ADD COLUMN material_layout ENUM('legacy','flipbook') NOT NULL DEFAULT 'flipbook' AFTER image_url",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_interactions = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'interactions_json'
);
SET @sql = IF(
  @has_interactions = 0,
  'ALTER TABLE materials ADD COLUMN interactions_json LONGTEXT NULL AFTER references_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_page_count = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'pdf_page_count'
);
SET @sql = IF(
  @has_page_count = 0,
  'ALTER TABLE materials ADD COLUMN pdf_page_count INT UNSIGNED NULL AFTER interactions_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_updated_at = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'updated_at'
);
SET @sql = IF(
  @has_updated_at = 0,
  'ALTER TABLE materials ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE modules
SET material_layout = 'legacy'
WHERE name IN (
  'Bahan Kandungan Kimia dalam Skincare dan Kosmetik serta Dampaknya terhadap Kesehatan',
  'Cerdas Memilih Makanan dan Minuman dalam Perpekstif Kimia Pangan'
);

CREATE TABLE IF NOT EXISTS team_categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  layout ENUM('featured','grid') NOT NULL DEFAULT 'grid',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY team_categories_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  id INT NOT NULL AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(160) NOT NULL,
  image_url VARCHAR(255) NULL,
  bio VARCHAR(500) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY team_members_category_id_index (category_id),
  CONSTRAINT team_members_category_fk FOREIGN KEY (category_id)
    REFERENCES team_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO team_categories (name, layout, sort_order, is_active)
SELECT 'Pendiri', 'featured', 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM team_categories WHERE name = 'Pendiri');

INSERT INTO team_categories (name, layout, sort_order, is_active)
SELECT 'Tim Editor', 'grid', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM team_categories WHERE name = 'Tim Editor');

INSERT INTO team_members (category_id, name, role, sort_order, is_active)
SELECT tc.id, 'Dr. Dra. Sulastri, M.Si.', 'Pendiri', 0, TRUE
FROM team_categories tc
WHERE tc.name = 'Pendiri'
  AND NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Dr. Dra. Sulastri, M.Si.');

INSERT INTO team_members (category_id, name, role, sort_order, is_active)
SELECT tc.id, 'Muzainah Salahuddin S.Pd.', 'Koordinator Proyek', 0, TRUE
FROM team_categories tc
WHERE tc.name = 'Tim Editor'
  AND NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Muzainah Salahuddin S.Pd.');
