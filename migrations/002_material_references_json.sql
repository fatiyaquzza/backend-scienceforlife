ALTER TABLE materials
ADD COLUMN references_json JSON NULL AFTER file_url;
