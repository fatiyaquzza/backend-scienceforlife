-- Migration: status dan resolved_at untuk contact_feedback
--
-- Menambahkan kolom yang dipakai panel admin untuk menandai pesan sudah
-- ditangani.-production sudah punya kedua kolom ini, jadi di sana file ini
-- tidak melakukan apa-apa. Yang tetap perlu adalah database lama yang belum
-- menjalankan migration ini: tanpa kedua kolom, GET /api/contact/fallback
-- menyalin pesan sebagai "open" dan panel admin tidak bisa menandainya selesai.
--
-- Idempotent: aman dijalankan berulang, dan aman di database yang kolumnya
-- sudah ada. Tiap kolom dicek lewat information_schema sebelum ALTER, memakai
-- pola yang sama dengan 005_flipbook_and_team.sql.
--
-- Catatan:
-- contactController.js sengaja masih punya fallback baca-saja untuk database
-- yang belum menjalankan migration ini, supaya halaman admin tidak langsung
-- 500 saat ada instalasi lama. Fallback itu bukan pengganti migration.

SET @has_status = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_feedback' AND COLUMN_NAME = 'status'
);
SET @sql = IF(
  @has_status = 0,
  "ALTER TABLE contact_feedback ADD COLUMN status ENUM('open','done') NOT NULL DEFAULT 'open' AFTER message",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_resolved_at = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_feedback' AND COLUMN_NAME = 'resolved_at'
);
SET @sql = IF(
  @has_resolved_at = 0,
  'ALTER TABLE contact_feedback ADD COLUMN resolved_at TIMESTAMP NULL DEFAULT NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
