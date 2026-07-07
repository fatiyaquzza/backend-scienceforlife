-- Migration: ubah deskripsi modul ke LONGTEXT agar aman menyimpan HTML rich text.

ALTER TABLE modules
  MODIFY COLUMN description LONGTEXT NULL;
