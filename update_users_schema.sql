-- ATUALIZAÇÃO DA TABELA DE USUÁRIOS
-- Execute este script no SQL Editor do Supabase para corrigir o erro 400 no cadastro

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

-- Garantir que email pode ser nulo se necessário (ou manter unique se for chave)
-- ALTER TABLE users ALTER COLUMN email DROP NOT NULL; -- Use se necessário

COMMENT ON COLUMN users.user_code IS 'Código curto do usuário (ex: 01, 99)';
COMMENT ON COLUMN users.password_hash IS 'Senha do usuário (hash ou texto para sistemas simples)';
