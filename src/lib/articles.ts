import { getCollection, type CollectionEntry } from 'astro:content';
import type { Workflow } from './workflow';

export type Article = CollectionEntry<'articles'>;

export interface ArticleMeta extends Workflow {
  slug: string;       // 完整路径，例如 restaurant/2026-04-27/01-foo
  group: string;      // 一级目录，例如 restaurant
  batch: string;      // 二级目录（通常是日期），例如 2026-04-27
  filename: string;   // 文件名（无扩展名）
  title: string;
  date: string;
  excerpt: string;
  entry: Article;
}

function extractTitle(body: string, fallback: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function extractExcerpt(body: string): string {
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    return trimmed.length > 120 ? trimmed.slice(0, 120) + '…' : trimmed;
  }
  return '';
}

function extractDate(slug: string, frontmatterDate?: string): string {
  if (frontmatterDate) return frontmatterDate;
  const match = slug.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export async function getAllArticles(): Promise<ArticleMeta[]> {
  const entries = await getCollection('articles');
  return entries
    .map((entry) => {
      const slug = entry.id.replace(/\.md$/, '');
      const parts = slug.split('/');
      const group = parts[0] || '';
      const batch = parts[1] || '';
      const filename = parts[parts.length - 1] || slug;
      const filenameTitle = filename.replace(/^\d+-/, '');
      const data = entry.data as Workflow & { title?: string; date?: string };
      return {
        slug,
        group,
        batch,
        filename,
        title: data.title || extractTitle(entry.body || '', filenameTitle),
        date: extractDate(slug, data.date),
        excerpt: extractExcerpt(entry.body || ''),
        entry,
        status: data.status,
        assignee: data.assignee,
        platform: data.platform,
        shoot_date: data.shoot_date,
        publish_date: data.publish_date,
        publish_url: data.publish_url,
        tags: data.tags,
        cover_idea: data.cover_idea,
        notes: data.notes,
      };
    })
    .sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
}

export async function getArticlesByGroup(groupKey: string): Promise<ArticleMeta[]> {
  const all = await getAllArticles();
  return all.filter((a) => a.group === groupKey);
}

export function groupByBatch(articles: ArticleMeta[]): Map<string, ArticleMeta[]> {
  const groups = new Map<string, ArticleMeta[]>();
  for (const article of articles) {
    const list = groups.get(article.batch) || [];
    list.push(article);
    groups.set(article.batch, list);
  }
  return groups;
}
