-- SCRIPT PARA ACEITE EM MASSA DOS TERMOS
-- Execute este script no SQL Editor do Supabase para marcar todos os usuários atuais como "Aceite Realizado"

UPDATE users 
SET terms_accepted_at = NOW() 
WHERE terms_accepted_at IS NULL;
