-- Execute este comando no Editor SQL do Supabase para corrigir o erro de coluna ausente.
-- Isso adicionará a coluna 'currentKm' à tabela 'vehicles'.

ALTER TABLE vehicles ADD COLUMN "currentKm" bigint DEFAULT 0;
