import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 防弹 schema：写手手写 frontmatter 千奇百怪（不带引号的日期、字符串平台、数字标签…），
// 一律强制转换而不是报错 —— 单篇稿件永远不能把整站构建搞挂。
const looseString = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10); // date: 2026-06-05 未加引号
  return String(v);
}, z.string().optional());

const looseStringArray = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)]; // platform: 小红书（写成了字符串）
}, z.array(z.string()).optional());

const looseBoolean = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() === 'true';
}, z.boolean().optional());

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: looseString,
    date: looseString,
    // 工作流字段
    status: looseString,
    assignee: looseString,
    platform: looseStringArray,
    shoot_date: looseString,
    publish_date: looseString,
    publish_url: looseString,
    tags: looseStringArray,
    cover_idea: looseString,
    notes: looseString,
    draft: looseBoolean,
  }).passthrough(),
});

export const collections = { articles };
