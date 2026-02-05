-- ATUALIZAÇÃO DE SCHEMA DO BANCO DE DADOS
-- Copie e cole todo este conteúdo no "SQL Editor" do seu painel Supabase

-- 1. Campos para Assinatura Eletrônica e Auditoria de IP (Tabela incidents)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS signature_hash text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_ip text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updated_ip text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS approved_ip text;

-- 2. Campos para Gestão de Frota (Tabela vehicles)
-- Estes campos estavam faltando e causando erros ao salvar/editar veículos
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fleet_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type text;

-- 3. (OPCIONAL MAS RECOMENDADO) Blindagem de Registros Aprovados
-- Esta regra impede que qualquer usuário (mesmo autenticado) altere um registro que já foi aprovado.
-- Garante a imutabilidade jurídica do documento assinado.
-- Se der erro dizendo que a policy já existe, ignore.

-- DROP POLICY IF EXISTS "Impedir edição de aprovados" ON incidents;
-- CREATE POLICY "Impedir edição de aprovados" ON incidents FOR UPDATE USING (status != 'APPROVED');

-- 4. Comentários para documentação (Opcional)
COMMENT ON COLUMN incidents.signature_hash IS 'Hash SHA-256 gerado no momento da validação para garantir integridade e não-repúdio.';
COMMENT ON COLUMN incidents.created_ip IS 'Endereço IP do autor no momento da criação.';
COMMENT ON COLUMN incidents.approved_ip IS 'Endereço IP do supervisor no momento da validação.';
