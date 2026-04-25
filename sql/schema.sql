-- Database: posyandu
-- Import via phpMyAdmin atau: mysql -u root < schema.sql
CREATE DATABASE IF NOT EXISTS `posyandu` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `posyandu`;

SET NAMES utf8mb4;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default login: admin / admin123
INSERT INTO `users` (`username`, `password_hash`) VALUES
('admin', '$2y$10$ECIO5dYssADrwQQJNwW.7uhRJ80CIZdFWc8nO75/.WmA3yUu19R06');

CREATE TABLE `warga` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `alamat` text,
  `no_kk` varchar(32) DEFAULT NULL,
  `nama` varchar(200) NOT NULL,
  `nik` varchar(16) NOT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('L','P') NOT NULL DEFAULT 'L',
  `agama` varchar(50) DEFAULT NULL,
  `warga_negara` varchar(50) NOT NULL DEFAULT 'WNI',
  `hubungan_keluarga` varchar(100) DEFAULT NULL,
  `status_nikah` varchar(50) DEFAULT NULL,
  `pendidikan` varchar(100) DEFAULT NULL,
  `pekerjaan` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'aktif',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warga_nik` (`nik`),
  KEY `warga_tanggal_lahir` (`tanggal_lahir`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pemeriksaan_balita` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `warga_id` int unsigned NOT NULL,
  `tanggal` date NOT NULL,
  `berat_kg` decimal(5,2) NOT NULL,
  `tinggi_cm` decimal(5,2) NOT NULL,
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pmb_warga` (`warga_id`),
  KEY `pmb_tanggal` (`tanggal`),
  CONSTRAINT `pmb_fk_warga` FOREIGN KEY (`warga_id`) REFERENCES `warga` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
