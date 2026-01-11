-- Script to populate organization_id for existing data
-- Run this AFTER running the organization_segregation.sql script

-- 1. Update calls table with organization_id from users
UPDATE calls c 
JOIN users u ON c.useremail = u.usermail 
SET c.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 2. Update campaigns with organization_id based on assigned_to users
UPDATE campaigns camp 
JOIN users u ON camp.assigned_to = u.username 
SET camp.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 3. Update agent_sessions with organization_id from users
UPDATE agent_sessions ags 
JOIN users u ON ags.user_id = u.id 
SET ags.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 4. Update agent_breaks with organization_id from users
UPDATE agent_breaks ab 
JOIN users u ON ab.user_id = u.id 
SET ab.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 5. Update agent_heartbeats with organization_id from users
UPDATE agent_heartbeats ah 
JOIN users u ON ah.user_id = u.id 
SET ah.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 6. Update agent_presence_events with organization_id from users
UPDATE agent_presence_events ape 
JOIN users u ON ape.user_id = u.id 
SET ape.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 7. Update documents with organization_id from users
UPDATE documents d 
JOIN users u ON d.created_by = u.id 
SET d.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 8. Update notes with organization_id from users
UPDATE notes n 
JOIN users u ON n.user_id = u.id 
SET n.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 9. Update qa_call_reviews with organization_id from reviewer users
UPDATE qa_call_reviews qcr 
JOIN users u ON qcr.reviewer_user_id = u.id 
SET qcr.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 10. Update dm_form with organization_id based on added_by_user_id
UPDATE dm_form df 
JOIN users u ON df.added_by_user_id = u.id 
SET df.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL AND df.added_by_user_id IS NOT NULL;

-- 11. Update password_resets with organization_id from users
UPDATE password_resets pr 
JOIN users u ON pr.user_id = u.id 
SET pr.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 12. Update audit_logs with organization_id from users
UPDATE audit_logs al 
JOIN users u ON al.user_id = u.id 
SET al.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- 13. Update api_metrics with organization_id from users
UPDATE api_metrics am 
JOIN users u ON am.user_id = u.id 
SET am.organization_id = u.organization_id 
WHERE u.organization_id IS NOT NULL;

-- For tables without direct user relationships, you may need to set a default organization
-- or handle them based on your business logic

-- 14. Set default organization for break_reasons (make them global or assign to first org)
UPDATE break_reasons 
SET organization_id = (SELECT MIN(id) FROM organizations) 
WHERE organization_id IS NULL;

-- 15. Set default organization for agentic_campaigns (or make them global)
UPDATE agentic_campaigns 
SET organization_id = (SELECT MIN(id) FROM organizations) 
WHERE organization_id IS NULL;

-- 16. Set default organization for agentic_csv_files (or make them global)
UPDATE agentic_csv_files 
SET organization_id = (SELECT MIN(id) FROM organizations) 
WHERE organization_id IS NULL;

-- 17. Set default organization for feature_flags (or make them global)
UPDATE feature_flags 
SET organization_id = (SELECT MIN(id) FROM organizations) 
WHERE organization_id IS NULL;

-- Verification queries to check the data population
SELECT 'calls' as table_name, COUNT(*) as total_records, 
       COUNT(organization_id) as with_org_id,
       COUNT(*) - COUNT(organization_id) as without_org_id
FROM calls
UNION ALL
SELECT 'users' as table_name, COUNT(*) as total_records, 
       COUNT(organization_id) as with_org_id,
       COUNT(*) - COUNT(organization_id) as without_org_id
FROM users
UNION ALL
SELECT 'agent_sessions' as table_name, COUNT(*) as total_records, 
       COUNT(organization_id) as with_org_id,
       COUNT(*) - COUNT(organization_id) as without_org_id
FROM agent_sessions
UNION ALL
SELECT 'documents' as table_name, COUNT(*) as total_records, 
       COUNT(organization_id) as with_org_id,
       COUNT(*) - COUNT(organization_id) as without_org_id
FROM documents;