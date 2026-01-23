-- ================================================
-- MIGRATION 1: Adicionar super_admin ao enum
-- Esta migration precisa ser executada primeiro
-- ================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';