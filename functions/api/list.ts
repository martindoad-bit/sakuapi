import { requireIdentity, json } from '../_lib/auth';
import { getFile, listTreeFiles, type Env } from '../_lib/github';

interface Item {
  group: string;
  batch: string;
  filename: string;
  path: string;
  title: string;
  frontmatter?: Record<string, unknown>;
}

const BASE = 'src/content/articles';
const MAX_FRONTMATTER_FETCHES = 60;

function makeTitle(filename: string): string {
  return filename.replace(/\.md$/, '').replace(/^\d+-/, '');
}

// 极简 frontmatter 解析（只提关心的字段，不依赖外部库）
function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const yaml = m[1];
  const out: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const km = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!km) { i++; continue; }
    const key = km[1];
    let val = km[2];
    if (val === '|' || val === '|+' || val === '|-') {
      i++;
      const buf: string[] = [];
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        buf.push(lines[i].replace(/^ {2}/, ''));
        i++;
      }
      out[key] = buf.join('\n').replace(/\n+$/, '');
      continue;
    }
    if (val === '') {
      const peek = lines[i + 1];
      if (peek && peek.trim().startsWith('- ')) {
        const arr: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          arr.push(lines[i].trim().slice(2).replace(/^["']|["']$/g, ''));
          i++;
        }
        out[key] = arr;
        continue;
      }
      out[key] = '';
    } else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      out[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
    } else {
      out[key] = val.replace(/^["']|["']$/g, '');
    }
    i++;
  }
  return out;
}

async function fetchFrontmatter(env: Env, path: string): Promise<Record<string, unknown>> {
  try {
    const f = await getFile(env, path);
    if (!f) return {};
    return parseFrontmatter(f.content);
  } catch {
    return {};
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;

  const url = new URL(request.url);
  const includeFrontmatter = url.searchParams.get('frontmatter') === '1';

  try {
    const files = await listTreeFiles(env, BASE);
    let items: Item[] = files
      .filter((f) => f.path.endsWith('.md'))
      .map((f) => {
        const rel = f.path.slice(BASE.length + 1);
        const parts = rel.split('/');
        if (parts.length < 2) return null;
        const group = parts[0];
        const batch = parts.length >= 3 ? parts[1] : '';
        const filename = parts.length >= 3 ? parts.slice(2).join('/') : parts[1];
        return {
          group,
          batch,
          filename,
          path: f.path,
          title: makeTitle(filename.split('/').pop() || filename),
        } satisfies Item;
      })
      .filter((x): x is Item => x !== null)
      .sort((a, b) => {
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        if (a.batch !== b.batch) return b.batch.localeCompare(a.batch);
        return a.filename.localeCompare(b.filename);
      });

    if (includeFrontmatter) {
      // 限制并发，避免触发 GitHub 短期限速
      const slice = items.slice(0, MAX_FRONTMATTER_FETCHES);
      const fmList = await Promise.all(slice.map((item) => fetchFrontmatter(env, item.path)));
      slice.forEach((item, idx) => {
        const fm = fmList[idx] || {};
        item.frontmatter = fm;
        if (typeof fm.title === 'string' && fm.title.trim()) item.title = fm.title.trim();
      });
    }

    return json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
};
