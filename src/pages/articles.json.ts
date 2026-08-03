// 构建时生成的全站文章清单（静态文件，替代原来的运行时 /api/list）。
// 好处：秒开、永不触发 GitHub 限流、链接与静态页面天然一致（同一次构建产出）。
// 数据新鲜度依赖「每次 commit 自动重新部署」（.github/workflows/deploy.yml）。
import type { APIRoute } from 'astro';
import { getAllArticles } from '../lib/articles';

export const GET: APIRoute = async () => {
  const articles = await getAllArticles();
  const items = articles.map((a) => ({
    slug: a.slug,           // 页面 URL 路径（构建产物，保证可打开）
    path: a.repoPath,       // GitHub 真实文件路径（编辑/删除用）
    group: a.group,
    batch: a.batch,
    filename: a.filename,
    title: a.title,
    date: a.date,
    excerpt: a.excerpt,
    status: a.status ?? null,
    assignee: a.assignee ?? null,
    platform: a.platform ?? [],
    tags: a.tags ?? [],
    publish_date: a.publish_date ?? null,
    publish_url: a.publish_url ?? null,
  }));
  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
