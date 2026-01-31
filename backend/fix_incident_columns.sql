-- Ensuring all necessary columns exist for the incidents table
-- Run this script in your Supabase SQL Editor

DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'edited_by') THEN
        ALTER TABLE incidents ADD COLUMN edited_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'last_edited_at') THEN
        ALTER TABLE incidents ADD COLUMN last_edited_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_edited') THEN
        ALTER TABLE incidents ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE incidents ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- Ensure approved_by and approved_at also exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'approved_by') THEN
        ALTER TABLE incidents ADD COLUMN approved_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'approved_at') THEN
        ALTER TABLE incidents ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;

    -- Ensure other core columns exist (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'vigilants') THEN
        ALTER TABLE incidents ADD COLUMN vigilants TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'alteration_type') THEN
        ALTER TABLE incidents ADD COLUMN alteration_type TEXT;
    END IF;

END $$;
