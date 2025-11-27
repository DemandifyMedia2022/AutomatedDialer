-- Migration: Create system_health_snapshots table for superadmin dashboard
-- This table stores periodic snapshots of system health metrics

CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  frontend_status VARCHAR(50) NOT NULL,
  backend_status VARCHAR(50) NOT NULL,
  database_status VARCHAR(50) NOT NULL,
  agentic_status VARCHAR(50) NOT NULL,
  backend_response INT NULL COMMENT 'Response time in milliseconds',
  database_response INT NULL COMMENT 'Response time in milliseconds',
  error_rate FLOAT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_system_health_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
