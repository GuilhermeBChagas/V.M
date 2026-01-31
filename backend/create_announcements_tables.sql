-- Versão Final: Compatível com IDs customizados (ex: admin-master) e UUIDs
-- Alteramos sender_id e user_id para TEXT para evitar o erro 22P02 (invalid input syntax for type uuid)

-- 1. Criar ou Recriar a Tabela de Recados
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_id TEXT, -- Alterado para TEXT para suportar 'admin-master' etc.
    target_type TEXT NOT NULL CHECK (target_type IN ('USER', 'GROUP', 'BROADCAST')),
    target_id TEXT, -- Armazena UUID do User ou Nome da Role (ex: 'ADMIN')
    priority TEXT NOT NULL DEFAULT 'INFO' CHECK (priority IN ('INFO', 'IMPORTANT', 'URGENT')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Status de Leitura
CREATE TABLE IF NOT EXISTS announcement_reads (
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Alterado para TEXT
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

-- 3. Habilitar RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 4. Limpar políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Qualquer usuário logado pode visualizar recados destinados a ele ou broadcast" ON announcements;
DROP POLICY IF EXISTS "Apenas administradores podem criar recados" ON announcements;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias leituras" ON announcement_reads;
DROP POLICY IF EXISTS "Usuários podem registrar suas leituras" ON announcement_reads;

-- 5. Novas Políticas de Acesso (Compatíveis com TEXT)
CREATE POLICY "Qualquer usuário logado pode visualizar recados destinados a ele ou broadcast" ON announcements
FOR SELECT USING (
    target_type = 'BROADCAST' OR 
    (target_type = 'USER' AND target_id = auth.uid()::text) OR
    (target_type = 'GROUP' AND target_id IN (
        SELECT role::text FROM public.users WHERE id::text = auth.uid()::text
    ))
);

CREATE POLICY "Apenas administradores podem criar recados" ON announcements
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('ADMIN', 'SUPERVISOR')
    ) OR sender_id = 'admin-master' -- Permite envio via conta master local
);

CREATE POLICY "Usuários podem ver suas próprias leituras" ON announcement_reads
FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'admin-master');

CREATE POLICY "Usuários podem registrar suas leituras" ON announcement_reads
FOR INSERT WITH CHECK (user_id = auth.uid()::text OR user_id = 'admin-master');
