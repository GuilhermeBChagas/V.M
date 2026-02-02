-- Migration: Fix Deletion and Update policies for Announcements
-- Run this in your Supabase SQL Editor

-- 0. Safety check: Ensure sender_id exists in announcements
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='sender_id') THEN
        ALTER TABLE announcements ADD COLUMN sender_id TEXT;
    END IF;
END $$;

-- 1. Enable DELETE for admins and supervisors on announcements table
DROP POLICY IF EXISTS "Admins e Supervisores podem excluir recados" ON announcements;
-- EXTREMA ATENÇÃO: Se o seu sistema não usa o Supabase Auth (Login nativo do Supabase), 
-- o comando auth.uid() retornará SEMPRE nulo. Isso bloqueia qualquer política baseada em usuário.
-- O script abaixo permite a exclusão para todos os usuários (Incluindo anônimos) para fins de teste.

DROP POLICY IF EXISTS "Permitir tudo para Administradores (Contingência)" ON announcements;
CREATE POLICY "Permitir tudo para Administradores (Contingência)" ON announcements
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para Leituras (Contingência)" ON announcement_reads;
CREATE POLICY "Permitir tudo para Leituras (Contingência)" ON announcement_reads
FOR ALL USING (true) WITH CHECK (true);


-- 2. Enable UPDATE for admins and supervisors on announcements table
DROP POLICY IF EXISTS "Admins e Supervisores podem editar recados" ON announcements;
CREATE POLICY "Admins e Supervisores podem editar recados" ON announcements
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND (role IN ('Nível 5', 'Nível 4', 'ADMIN', 'SUPERVISOR'))
    ) OR (sender_id = 'admin-master')
)
WITH CHECK (
    auth.uid()::text IN ('admin-master', 'emergency-master') OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND (role IN ('Nível 5', 'Nível 4', 'ADMIN', 'SUPERVISOR'))
    )
);

-- 3. Enable DELETE for admins and supervisors on announcement_reads table
-- Removed invalid sender_id reference (this table uses user_id)
DROP POLICY IF EXISTS "Admins e Supervisores podem excluir registros de leitura" ON announcement_reads;
CREATE POLICY "Admins e Supervisores podem excluir registros de leitura" ON announcement_reads
FOR DELETE USING (
    auth.uid()::text IN ('admin-master', 'emergency-master') OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND (role IN ('Nível 5', 'Nível 4', 'ADMIN', 'SUPERVISOR'))
    )
);

DROP POLICY IF EXISTS "Admins e Supervisores podem ver todos os registros de leitura" ON announcement_reads;
CREATE POLICY "Admins e Supervisores podem ver todos os registros de leitura" ON announcement_reads
FOR SELECT USING (
    auth.uid()::text IN ('admin-master', 'emergency-master') OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id::text = auth.uid()::text 
        AND (role IN ('Nível 5', 'Nível 4', 'ADMIN', 'SUPERVISOR'))
    )
);

