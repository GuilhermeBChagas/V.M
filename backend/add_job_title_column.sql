-- Add job_title_id column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'job_title_id') THEN
        ALTER TABLE users ADD COLUMN job_title_id TEXT;
    END IF;
END $$;
