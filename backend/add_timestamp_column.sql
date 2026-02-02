-- Adiciona a coluna timestamp caso ela não exista
-- Isso é necessário para preservar a data de criação original durante edições (UPSERT)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'timestamp') THEN
        ALTER TABLE incidents ADD COLUMN timestamp TIMESTAMPTZ;
    END IF;
END $$;
