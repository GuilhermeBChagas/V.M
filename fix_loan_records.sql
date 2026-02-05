-- CORREÇÃO DA TABELA LOAN_RECORDS
-- Adiciona colunas de auditoria e assinatura eletrônica que estão faltando

ALTER TABLE loan_records ADD COLUMN IF NOT EXISTS created_ip text;
ALTER TABLE loan_records ADD COLUMN IF NOT EXISTS updated_ip text;
ALTER TABLE loan_records ADD COLUMN IF NOT EXISTS signature_hash text;

-- Comentários para documentação
COMMENT ON COLUMN loan_records.created_ip IS 'IP de quem criou a cautela';
COMMENT ON COLUMN loan_records.updated_ip IS 'IP de quem confirmou ou devolveu';
COMMENT ON COLUMN loan_records.signature_hash IS 'Assinatura digital para garantir integridade';
