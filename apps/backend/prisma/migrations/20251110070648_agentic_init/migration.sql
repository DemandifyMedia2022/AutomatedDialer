-- CreateTable
CREATE TABLE `agent_stats` (
    `id` INTEGER NULL,
    `agent_name` VARCHAR(255) NULL,
    `allocated_extension` VARCHAR(255) NULL,
    `total_calls` VARCHAR(255) NULL,
    `date` DATE NULL,
    `total_call_time` VARCHAR(255) NULL,
    `call_time` VARCHAR(255) NULL,
    `idle_time` VARCHAR(255) NULL,
    `break_time` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calls` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `campaign_name` VARCHAR(255) NULL,
    `useremail` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `unique_id` VARCHAR(255) NULL,
    `start_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `answer_time` TIMESTAMP(0) NULL,
    `end_time` TIMESTAMP(0) NULL,
    `call_duration` INTEGER NULL,
    `billed_duration` INTEGER NULL,
    `source` VARCHAR(255) NULL,
    `extension` VARCHAR(255) NULL,
    `region` VARCHAR(255) NULL,
    `charges` DECIMAL(10, 2) NULL,
    `direction` VARCHAR(255) NULL,
    `destination` VARCHAR(255) NULL,
    `disposition` VARCHAR(255) NULL,
    `platform` VARCHAR(255) NULL,
    `recording_url` VARCHAR(2000) NULL,
    `call_type` VARCHAR(255) NULL,
    `remarks` VARCHAR(22) NULL,
    `prospect_name` VARCHAR(55) NULL,
    `prospect_email` VARCHAR(55) NULL,
    `prospect_company` VARCHAR(100) NULL,
    `job_title` VARCHAR(55) NULL,
    `job_level` VARCHAR(255) NULL,
    `data_source_type` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NULL,
    `campaign_name` VARCHAR(255) NULL,
    `start_date` DATETIME(6) NULL,
    `end_date` DATETIME(6) NULL,
    `allocations` VARCHAR(255) NULL,
    `assigned_to` VARCHAR(255) NULL,
    `status` VARCHAR(255) NULL,
    `method` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(6) NULL,
    `updated_at` TIMESTAMP(6) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extensions` (
    `id` INTEGER NULL,
    `extension_id` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` VARCHAR(255) NULL,
    `unique_user_id` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `usermail` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `extension` VARCHAR(255) NULL,
    `status` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(6) NULL,
    `updated_at` TIMESTAMP(6) NULL,

    UNIQUE INDEX `unique_user_name`(`unique_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcripts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `call_id` BIGINT NOT NULL,
    `ts` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `speaker` VARCHAR(32) NOT NULL,
    `text` VARCHAR(2000) NOT NULL,
    `sentiment` VARCHAR(32) NULL,
    `confidence` DOUBLE NULL,

    INDEX `transcripts_call_id_ts_idx`(`call_id`, `ts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agentic_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `agent_text` TEXT NOT NULL,
    `session_text` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `agentic_campaigns_module_key`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agentic_csv_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `size` INTEGER NOT NULL,
    `mtime` BIGINT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `agentic_csv_files_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transcripts` ADD CONSTRAINT `transcripts_call_id_fkey` FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
