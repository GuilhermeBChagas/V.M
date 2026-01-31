-- Add editing and cancellation tracking columns to incidents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'edited_by') THEN
        ALTER TABLE incidents ADD COLUMN edited_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE incidents ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;
