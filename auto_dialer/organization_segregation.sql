-- MySQL script to add organization-level segregation
-- This will ensure users can only see data from their own organization

-- 1. Add organization_id to campaigns table
ALTER TABLE campaigns 
ADD COLUMN organization_id INT,
ADD INDEX idx_campaigns_organization (organization_id),
ADD CONSTRAINT fk_campaigns_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Add organization_id to agent_sessions table
ALTER TABLE agent_sessions 
ADD COLUMN organization_id INT,
ADD INDEX idx_agent_sessions_organization (organization_id),
ADD CONSTRAINT fk_agent_sessions_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. Add organization_id to agent_breaks table
ALTER TABLE agent_breaks 
ADD COLUMN organization_id INT,
ADD INDEX idx_agent_breaks_organization (organization_id),
ADD CONSTRAINT fk_agent_breaks_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Add organization_id to agent_heartbeats table
ALTER TABLE agent_heartbeats 
ADD COLUMN organization_id INT,
ADD INDEX idx_agent_heartbeats_organization (organization_id),
ADD CONSTRAINT fk_agent_heartbeats_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Add organization_id to agent_presence_events table
ALTER TABLE agent_presence_events 
ADD COLUMN organization_id INT,
ADD INDEX idx_agent_presence_events_organization (organization_id),
ADD CONSTRAINT fk_agent_presence_events_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 6. Add organization_id to dialer_sheets table
ALTER TABLE dialer_sheets 
ADD COLUMN organization_id INT,
ADD INDEX idx_dialer_sheets_organization (organization_id),
ADD CONSTRAINT fk_dialer_sheets_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 7. Add organization_id to dialing_contacts table
ALTER TABLE dialing_contacts 
ADD COLUMN organization_id INT,
ADD INDEX idx_dialing_contacts_organization (organization_id),
ADD CONSTRAINT fk_dialing_contacts_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 8. Add organization_id to documents table
ALTER TABLE documents 
ADD COLUMN organization_id INT,
ADD INDEX idx_documents_organization (organization_id),
ADD CONSTRAINT fk_documents_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 9. Add organization_id to notes table
ALTER TABLE notes 
ADD COLUMN organization_id INT,
ADD INDEX idx_notes_organization (organization_id),
ADD CONSTRAINT fk_notes_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 10. Add organization_id to qa_call_reviews table
ALTER TABLE qa_call_reviews 
ADD COLUMN organization_id INT,
ADD INDEX idx_qa_call_reviews_organization (organization_id),
ADD CONSTRAINT fk_qa_call_reviews_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 11. Add organization_id to dm_form table (for lead management)
ALTER TABLE dm_form 
ADD COLUMN organization_id INT,
ADD INDEX idx_dm_form_organization (organization_id),
ADD CONSTRAINT fk_dm_form_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 12. Add organization_id to break_reasons table (if you want org-specific break reasons)
ALTER TABLE break_reasons 
ADD COLUMN organization_id INT,
ADD INDEX idx_break_reasons_organization (organization_id),
ADD CONSTRAINT fk_break_reasons_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 13. Add organization_id to agentic_campaigns table
ALTER TABLE agentic_campaigns 
ADD COLUMN organization_id INT,
ADD INDEX idx_agentic_campaigns_organization (organization_id),
ADD CONSTRAINT fk_agentic_campaigns_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 14. Add organization_id to agentic_csv_files table
ALTER TABLE agentic_csv_files 
ADD COLUMN organization_id INT,
ADD INDEX idx_agentic_csv_files_organization (organization_id),
ADD CONSTRAINT fk_agentic_csv_files_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 15. Add organization_id to password_resets table (for tracking)
ALTER TABLE password_resets 
ADD COLUMN organization_id INT,
ADD INDEX idx_password_resets_organization (organization_id),
ADD CONSTRAINT fk_password_resets_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 16. Add organization_id to audit_logs table (for organization-specific auditing)
ALTER TABLE audit_logs 
ADD COLUMN organization_id INT,
ADD INDEX idx_audit_logs_organization (organization_id),
ADD CONSTRAINT fk_audit_logs_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 17. Add organization_id to api_metrics table (for organization-specific metrics)
ALTER TABLE api_metrics 
ADD COLUMN organization_id INT,
ADD INDEX idx_api_metrics_organization (organization_id),
ADD CONSTRAINT fk_api_metrics_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 18. Add organization_id to feature_flags table (for organization-specific features)
ALTER TABLE feature_flags 
ADD COLUMN organization_id INT,
ADD INDEX idx_feature_flags_organization (organization_id),
ADD CONSTRAINT fk_feature_flags_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 19. Add organization_id to extension_dids table
ALTER TABLE extension_dids 
ADD COLUMN organization_id INT,
ADD INDEX idx_extension_dids_organization (organization_id),
ADD CONSTRAINT fk_extension_dids_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;