-- ============================================================
-- Migration 001: 增加身体数据字段 & 有氧距离字段
-- 在 Supabase 控制台 SQL Editor 中执行
-- ============================================================

-- 1. profiles 表：增加身体数据字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age               INTEGER CHECK (age BETWEEN 10 AND 120),
  ADD COLUMN IF NOT EXISTS height_cm         INTEGER CHECK (height_cm BETWEEN 100 AND 250),
  ADD COLUMN IF NOT EXISTS gender            TEXT    CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER CHECK (resting_heart_rate BETWEEN 30 AND 120);

-- 2. workout_sets 表：增加有氧距离字段
ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6, 2);

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'workout_sets')
  AND column_name IN ('age', 'height_cm', 'gender', 'resting_heart_rate', 'distance_km')
ORDER BY table_name, column_name;
