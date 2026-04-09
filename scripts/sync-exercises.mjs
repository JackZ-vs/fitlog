/**
 * 同步 data/exercises.json 到 Supabase exercises 表
 * 用法：node scripts/sync-exercises.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 .env.local
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env["NEXT_PUBLIC_SUPABASE_URL"];
const key = env["SUPABASE_SERVICE_ROLE_KEY"] || env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（/ANON_KEY），请检查 .env.local");
  process.exit(1);
}

const sb = createClient(url, key);

// 读取本地 JSON
const exercises = JSON.parse(
  readFileSync(resolve(__dirname, "../data/exercises.json"), "utf-8")
);

// 转换字段名：camelCase → snake_case
const rows = exercises.map((e) => ({
  id: e.id,
  name: e.name,
  name_en: e.nameEn ?? "",
  type: e.type,
  primary_muscles: e.primaryMuscles ?? [],
  secondary_muscles: e.secondaryMuscles ?? [],
  equipment: e.equipment ?? "",
  difficulty: e.difficulty ?? "",
  met: e.met ?? 0,
  description: e.description ?? "",
}));

console.log(`准备同步 ${rows.length} 条动作到 Supabase...`);

const { error } = await sb
  .from("exercises")
  .upsert(rows, { onConflict: "id" });

if (error) {
  console.error("同步失败：", error.message);
  process.exit(1);
}

console.log(`✓ 成功同步 ${rows.length} 条动作`);
