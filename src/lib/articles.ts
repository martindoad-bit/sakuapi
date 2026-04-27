import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;

export interface ArticleMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  folder: string;
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
      const folder = slug.split('/')[0] || '';
      const filenameTitle = (slug.split('/').pop() || slug).replace(/^\d+-/, '');
      return {
        slug,
        title: entry.data.title || extractTitle(entry.body || '', filenameTitle),
        date: extractDate(slug, entry.data.date),
        excerpt: extractExcerpt(entry.body || ''),
        folder,
        entry,
      };
    })
    .sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
}

export function groupByFolder(articles: ArticleMeta[]): Map<string, ArticleMeta[]> {
  const groups = new Map<string, ArticleMeta[]>();
  for (const article of articles) {
    const list = groups.get(article.folder) || [];
    list.push(article);
    groups.set(article.folder, list);
  }
  return groups;
}
