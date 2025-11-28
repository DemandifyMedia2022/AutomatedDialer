-- Add unique_id column to dm_form table
ALTER TABLE dm_form ADD COLUMN unique_id VARCHAR(255) NULL AFTER f_data_source;

-- Add index for better performance on unique_id lookups
CREATE INDEX idx_dm_form_unique_id ON dm_form(unique_id);
