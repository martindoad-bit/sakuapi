import { requireIdentity, authorFromIdentity, json } from '../_lib/auth';
import { putFileBytes, type Env } from '../_lib/github';

// 文件名清洗：保留中英文、数字、点、下划线、横线，其它统统下划线
function sanitizeName(name: string): string {
  const base = name.replace(/^.*[\\/]/, ''); // 去掉路径
  const dot = base.lastIndexOf('.');
  let stem = dot > 0 ? base.slice(0, dot) : base;
  let ext = dot > 0 ? base.slice(dot + 1) : '';
  stem = stem.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'file';
  ext = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (!ext) ext = 'bin';
  // 限长
  if (stem.length > 60) stem = stem.slice(0, 60);
  return `${stem}.${ext}`;
}

const ALLOWED_EXT = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
]);
const ALLOWED_GROUPS = new Set(['shared', 'restaurant', 'immigration', 'backup1']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MiB（GitHub Contents API 上限远高，但浏览器 base64 编码贵）

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;
  const id = idOrResp;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'expect multipart/form-data' }, 400);
  }

  const file = form.get('file');
  const group = String(form.get('group') || '').trim();
  if (!(file instanceof File)) return json({ error: 'file required' }, 400);
  if (!ALLOWED_GROUPS.has(group)) return json({ error: 'invalid group' }, 400);

  const safeName = sanitizeName(file.name || 'upload');
  const ext = safeName.split('.').pop() || '';
  if (!ALLOWED_EXT.has(ext)) {
    return json({ error: `extension not allowed: .${ext}` }, 400);
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.byteLength === 0) return json({ error: 'empty file' }, 400);
  if (buf.byteLength > MAX_BYTES) {
    return json({ error: `file too large (max ${MAX_BYTES} bytes)` }, 413);
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ts = now.getTime();

  const path = `public/uploads/${group}/${yyyy}-${mm}/${ts}-${safeName}`;
  const author = authorFromIdentity(id);
  const message = `upload: ${path.replace(/^public\//, '')} via admin`;

  try {
    const result = await putFileBytes(env, path, buf, message, author);
    return json({
      ok: true,
      url: '/' + path.replace(/^public\//, ''),
      path,
      sha: result.sha,
      commitUrl: result.commitUrl,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
};
