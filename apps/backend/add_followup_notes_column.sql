-- Add Followup_notes column to calls table
ALTER TABLE calls ADD COLUMN Followup_notes TEXT;

-- Add index for better performance (optional)
CREATE INDEX idx_calls_followup_notes ON calls(Followup_notes);
