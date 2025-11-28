-- SQL to verify dm_form table structure
-- Run this in phpMyAdmin or your MySQL client

-- Check if dm_form table exists
SHOW TABLES LIKE 'dm_form';

-- Show the structure of dm_form table
DESCRIBE dm_form;

-- Check if unique_id column exists
SHOW COLUMNS FROM dm_form LIKE 'unique_id';

-- Test insert to verify the table works
INSERT INTO dm_form (
    f_campaign_name, 
    f_lead, 
    f_resource_name, 
    f_data_source, 
    unique_id,
    f_first_name,
    form_status,
    added_by_user_id,
    qualifyleads_by,
    f_date
) VALUES (
    'test_campaign',
    'test_lead_123',
    'test_agent',
    'manual_dialer',
    'test_unique_id_456',
    'John',
    1,
    1,
    'test_user',
    NOW()
);

-- Verify the insert worked
SELECT * FROM dm_form WHERE unique_id = 'test_unique_id_456';

-- Clean up test data
DELETE FROM dm_form WHERE unique_id = 'test_unique_id_456';
