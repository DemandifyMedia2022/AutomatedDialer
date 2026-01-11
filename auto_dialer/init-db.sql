-- Initialize database with proper permissions
-- This file runs automatically when MySQL container starts for the first time

-- Ensure the database exists (already created by MYSQL_DATABASE env var, but just in case)
CREATE DATABASE IF NOT EXISTS automated_dialer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to dialer_user
GRANT ALL PRIVILEGES ON automated_dialer.* TO 'dialer_user'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE automated_dialer;



