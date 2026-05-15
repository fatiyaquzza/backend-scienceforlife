-- Migration: ubah kolom konten ke LONGTEXT untuk menyimpan HTML rich text
-- Jalankan di database science_for_life (atau sesuaikan nama DB Anda)

ALTER TABLE materials
  MODIFY COLUMN description LONGTEXT NULL;

ALTER TABLE questions
  MODIFY COLUMN question_text LONGTEXT NOT NULL;

ALTER TABLE question_options
  MODIFY COLUMN option_text LONGTEXT NOT NULL;
