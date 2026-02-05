-- Adiciona coluna para controle de aceite de termos
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at text;

COMMENT ON COLUMN users.terms_accepted_at IS 'Data/Hora do aceite dos termos de assinatura eletrônica. Null indica pendente.';
