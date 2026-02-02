-- MIGRATION: Rename roles to Levels 1-5
-- This script updates the 'users' table and the 'announcements' table to the new nomenclature.

-- 1. Update 'users' table
UPDATE users SET role = 'Nível 5' WHERE role = 'ADMIN';
UPDATE users SET role = 'Nível 4' WHERE role = 'SUPERVISOR';
UPDATE users SET role = 'Nível 3' WHERE role = 'OPERADOR';
UPDATE users SET role = 'Nível 2' WHERE role = 'RONDA';
UPDATE users SET role = 'Nível 1' WHERE role = 'OUTROS';

-- 2. Update 'announcements' table for targeted groups
UPDATE announcements SET target_id = 'Nível 5' WHERE target_type = 'GROUP' AND target_id = 'ADMIN';
UPDATE announcements SET target_id = 'Nível 4' WHERE target_type = 'GROUP' AND target_id = 'SUPERVISOR';
UPDATE announcements SET target_id = 'Nível 3' WHERE target_type = 'GROUP' AND target_id = 'OPERADOR';
UPDATE announcements SET target_id = 'Nível 2' WHERE target_type = 'GROUP' AND target_id = 'RONDA';
UPDATE announcements SET target_id = 'Nível 1' WHERE target_type = 'GROUP' AND target_id = 'OUTROS';

-- 3. Update RLS policies for announcements
DROP POLICY IF EXISTS "Apenas administradores podem criar recados" ON announcements;
CREATE POLICY "Apenas administradores podem criar recados" ON announcements
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('Nível 5', 'Nível 4')
    ) OR sender_id = 'admin-master'
);
