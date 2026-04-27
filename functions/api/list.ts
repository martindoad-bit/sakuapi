import { requireIdentity, json } from '../_lib/auth';
import { listTreeFiles, type Env } from '../_lib/github';

interface Item {
  group: string;
  batch: string;
  filename: string;
  path: string;
  title: string;
}

const BASE = 'src/content/articles';

// 从文件内容里挖第一个 # 标题做为显示用 title。
// 但 list 不读文件内容（贵）—— 直接用 filename 当兜底，前端可再异步刷新。
function makeTitle(filename: string): string {
  return filename.replace(/\.md$/, '').replace(/^\d+-/, '');
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;

  try {
    const files = await listTreeFiles(env, BASE);
    const items: Item[] = files
      .filter((f) => f.path.endsWith('.md'))
      .map((f) => {
        // path = src/content/articles/{group}/{batch}/{filename}.md
        const rel = f.path.slice(BASE.length + 1);
        const parts = rel.split('/');
        // 兼容只有 group/file.md 的情况
        if (parts.length < 2) {
          return null;
        }
        let group = parts[0];
        let batch = '';
        let filename = '';
        if (parts.length === 2) {
          filename = parts[1];
        } else {
          batch = parts[1];
          filename = parts.slice(2).join('/');
        }
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
        // group 内按 batch desc + filename asc
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        if (a.batch !== b.batch) return b.batch.localeCompare(a.batch);
        return a.filename.localeCompare(b.filename);
      });
    return json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
};
