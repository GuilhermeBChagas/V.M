-- Add cancellation tracking columns to incidents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'cancelled_by') THEN
        ALTER TABLE incidents ADD COLUMN cancelled_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'cancelled_at') THEN
        ALTER TABLE incidents ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;
