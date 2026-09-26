-- Schema dasar ILMANA.
--
-- File ini adalah satu-satunya sumber kebenaran bentuk database untuk instalasi
-- baru. Dihasilkan dari CREATE TABLE pada MariaDB 11.8.9 (produksi), lalu
-- ditulis ulang dengan CREATE TABLE IF NOT EXISTS supaya boleh dijalankan
-- berulang tanpa error.
--
-- JANGAN pernah menjalankan file ini pada database yang sudah berisi data.
-- Adanya tabel tidak berarti isinya sesuai: satu tabel bisa sudah ada lalu
-- dilewati tanpa error, sementara tabel lain belum pernah dibuat. Untuk
-- database yang sudah ada, pakai folder migrations/ (001-005) yang additive.
--
-- Tabel (11):
--    1. users
--    2. modules
--    3. sub_modules
--    4. materials
--    5. questions
--    6. question_options
--    7. user_progress
--    8. user_answers
--    9. contact_feedback
--   10. team_categories
--   11. team_members
--
-- Urutan CREATE di bawah mengikuti dependensi foreign key, bukan alfabet.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `job` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- modules
CREATE TABLE IF NOT EXISTS `modules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` longtext DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `material_layout` enum('legacy','flipbook') NOT NULL DEFAULT 'flipbook',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- sub_modules
CREATE TABLE IF NOT EXISTS `sub_modules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `module_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `passing_grade` int(11) DEFAULT 70,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `module_id` (`module_id`),
  CONSTRAINT `sub_modules_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- materials
CREATE TABLE IF NOT EXISTS `materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sub_module_id` int(11) NOT NULL,
  `description` longtext DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `references_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`references_json`)),
  `interactions_json` longtext DEFAULT NULL,
  `pdf_page_count` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sub_module_id` (`sub_module_id`),
  CONSTRAINT `materials_ibfk_1` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- questions
CREATE TABLE IF NOT EXISTS `questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sub_module_id` int(11) NOT NULL,
  `type` enum('pretest','postest') NOT NULL,
  `question_type` enum('choice') NOT NULL,
  `question_text` longtext NOT NULL,
  `correct_answer` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sub_module_id` (`sub_module_id`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- question_options
CREATE TABLE IF NOT EXISTS `question_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) NOT NULL,
  `option_label` char(1) NOT NULL,
  `option_text` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `question_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- user_progress
CREATE TABLE IF NOT EXISTS `user_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `sub_module_id` int(11) NOT NULL,
  `pretest_done` tinyint(1) DEFAULT 0,
  `pretest_score` int(11) DEFAULT 0,
  `postest_done` tinyint(1) DEFAULT 0,
  `postest_score` int(11) DEFAULT 0,
  `is_passed` tinyint(1) DEFAULT 0,
  `last_accessed` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_submodule` (`user_id`,`sub_module_id`),
  KEY `sub_module_id` (`sub_module_id`),
  CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_progress_ibfk_2` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- user_answers
CREATE TABLE IF NOT EXISTS `user_answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `test_type` enum('pretest','postest') NOT NULL,
  `user_answer` text DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `answered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `user_answers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1872 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- contact_feedback
CREATE TABLE IF NOT EXISTS `contact_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `message` text NOT NULL,
  `status` enum('open','done') NOT NULL DEFAULT 'open',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- team_categories
CREATE TABLE IF NOT EXISTS `team_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `layout` enum('featured','grid') NOT NULL DEFAULT 'grid',
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_categories_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- team_members
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(160) NOT NULL,
  `role` varchar(160) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `bio` varchar(500) DEFAULT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `team_members_category_id_index` (`category_id`),
  CONSTRAINT `team_members_category_fk` FOREIGN KEY (`category_id`) REFERENCES `team_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;
SET FOREIGN_KEY_CHECKS = 1;
