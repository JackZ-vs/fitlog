-- ============================================================
-- FitLog — Supabase Schema
-- 在 Supabase 控制台 SQL Editor 中执行此文件
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. profiles（扩展 auth.users）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username      TEXT        UNIQUE NOT NULL,
  display_name  TEXT,
  role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url    TEXT,
  weight_kg     NUMERIC(5, 2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. exercises（动作库，全局共享）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id                BIGINT      PRIMARY KEY,  -- 与 seed 数据对应
  name              TEXT        NOT NULL,
  name_en           TEXT,
  type              TEXT        NOT NULL,
  primary_muscles   TEXT[]      DEFAULT '{}',
  secondary_muscles TEXT[]      DEFAULT '{}',
  equipment         TEXT,
  difficulty        TEXT,
  risk              INTEGER     DEFAULT 0,
  met               NUMERIC(5, 2),
  description       TEXT,
  image_url         TEXT,
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- seed 插入后重置序列（若需要 SERIAL 自增）
-- SELECT setval(pg_get_serial_sequence('exercises', 'id'), 130);

-- ────────────────────────────────────────────────────────────
-- 3. workouts（训练记录主表）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workouts (
  id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date                DATE        NOT NULL,
  name                TEXT,
  notes               TEXT,
  is_public           BOOLEAN     DEFAULT FALSE,
  estimated_calories  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- ────────────────────────────────────────────────────────────
-- 4. workout_sets（训练组详情）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  workout_id  UUID        REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id BIGINT      REFERENCES public.exercises(id) NOT NULL,
  set_number  INTEGER     NOT NULL,
  weight      NUMERIC(7, 2),
  reps        INTEGER,
  duration    INTEGER,     -- seconds
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_sets_workout_id_idx ON public.workout_sets(workout_id);

-- ────────────────────────────────────────────────────────────
-- 5. meals（饮食记录）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meals (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE        NOT NULL,
  meal_type   TEXT        NOT NULL CHECK (meal_type IN ('早餐', '午餐', '晚餐', '加餐')),
  food_name   TEXT        NOT NULL,
  amount_g    NUMERIC(8, 2),
  calories    NUMERIC(8, 2),
  protein     NUMERIC(8, 2),
  carbs       NUMERIC(8, 2),
  fat         NUMERIC(8, 2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. daily_targets（每日营养目标）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_targets (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  calories    INTEGER     DEFAULT 2000,
  protein     INTEGER     DEFAULT 150,
  carbs       INTEGER     DEFAULT 250,
  fat         INTEGER     DEFAULT 65,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_targets  ENABLE ROW LEVEL SECURITY;

-- profiles：所有登录用户可读；只能更新自己
CREATE POLICY "profiles_select"  ON public.profiles FOR SELECT  TO authenticated USING (true);
CREATE POLICY "profiles_insert"  ON public.profiles FOR INSERT  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update"  ON public.profiles FOR UPDATE  TO authenticated USING (auth.uid() = id);

-- exercises：所有人可读；只有 admin 可写
CREATE POLICY "exercises_select" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "exercises_insert" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "exercises_update" ON public.exercises FOR UPDATE TO authenticated
  USING       (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "exercises_delete" ON public.exercises FOR DELETE TO authenticated
  USING       (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- workouts：自己的全权限；public=true 的其他人可读
CREATE POLICY "workouts_select"  ON public.workouts FOR SELECT  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "workouts_insert"  ON public.workouts FOR INSERT  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update"  ON public.workouts FOR UPDATE  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "workouts_delete"  ON public.workouts FOR DELETE  TO authenticated
  USING (auth.uid() = user_id);

-- workout_sets：通过 workouts 的归属判断
CREATE POLICY "wsets_select" ON public.workout_sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND (w.user_id = auth.uid() OR w.is_public)));
CREATE POLICY "wsets_insert" ON public.workout_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "wsets_update" ON public.workout_sets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "wsets_delete" ON public.workout_sets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- meals / daily_targets：只能操作自己的数据
CREATE POLICY "meals_own"   ON public.meals          FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "targets_own" ON public.daily_targets  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 使用说明
-- ============================================================
-- 1. 在 Supabase Auth > Settings 中关闭 "Enable Email Confirmations"（小团队直接用）
-- 2. 管理员账号：在 Auth > Users > "Invite user" 创建 admin@fitlog.app，
--    然后手动 UPDATE profiles SET role='admin' WHERE username='admin';
-- 3. 普通用户：在 Auth > Users > "Invite user" 创建 {username}@fitlog.app
-- 4. 执行 seed.sql 导入动作库
