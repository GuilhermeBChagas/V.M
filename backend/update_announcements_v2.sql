-- Migration to enhance Announcements system
-- Add support for multiple targets (groups/users), read confirmation requests, and attachments

-- 1. Add new columns to announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS request_confirmation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS target_data JSONB DEFAULT '{"type": "BROADCAST", "groups": [], "users": []}'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Update existing records to populate target_data based on old columns (migration strategy)
UPDATE announcements 
SET target_data = jsonb_build_object(
    'type', target_type, 
    'groups', CASE WHEN target_type = 'GROUP' THEN jsonb_build_array(target_id) ELSE '[]'::jsonb END,
    'users', CASE WHEN target_type = 'USER' THEN jsonb_build_array(target_id) ELSE '[]'::jsonb END
)
WHERE target_data IS NULL OR target_data = '{"type": "BROADCAST", "groups": [], "users": []}'::jsonb;

-- 3. RLS Update for multiple targets
DROP POLICY IF EXISTS "Qualquer usuário logado pode visualizar recados destinados a ele ou broadcast" ON announcements;

CREATE POLICY "Qualquer usuário logado pode visualizar recados destinados a ele ou broadcast" ON announcements
FOR SELECT USING (
    (target_data->>'type' = 'BROADCAST') OR
    (target_data->'users' ? auth.uid()::text) OR
    (
        target_data->>'type' != 'BROADCAST' AND 
        EXISTS (
            SELECT 1 
            FROM jsonb_array_elements_text(target_data->'groups') AS grp
            WHERE grp = (SELECT role FROM public.users WHERE id::text = auth.uid()::text)::text
        )
    )
);

-- 4. Ensure announcement_reads has necessary constraints or indices if needed (it already has PK on announcement_id, user_id)
