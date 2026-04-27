import { requireIdentity, authorFromIdentity, isAllowedPath, json } from '../_lib/auth';
import { getFile, putFile, deleteFile, type Env } from '../_lib/github';

// GET ?path=...
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;

  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '';
  if (!isAllowedPath(path) || !path.endsWith('.md')) {
    return json({ error: 'invalid path' }, 400);
  }

  try {
    const file = await getFile(env, path);
    if (!file) return json({ error: 'not found' }, 404);
    return json({ path: file.path, sha: file.sha, content: file.content, size: file.size });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
};

// POST { path, content, message?, sha? }
// 没 sha 时尝试创建；如果远端已存在，返回冲突让前端再带 sha 重试（或自动取一次）
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;
  const id = idOrResp;

  let body: { path?: string; content?: string; message?: string; sha?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const path = body.path || '';
  const content = body.content;
  if (!isAllowedPath(path) || !path.endsWith('.md')) {
    return json({ error: 'invalid path' }, 400);
  }
  if (typeof content !== 'string') {
    return json({ error: 'content required' }, 400);
  }

  const author = authorFromIdentity(id);
  let sha = body.sha;

  // 如果没传 sha，先看远端有没有这文件；存在就拿到它的 sha 当 update。
  if (!sha) {
    try {
      const existing = await getFile(env, path);
      if (existing) sha = existing.sha;
    } catch {
      // 忽略，按创建走
    }
  }

  const message =
    body.message ||
    `${sha ? 'update' : 'create'}: ${path.replace(/^src\/content\/articles\//, '')} via admin`;

  try {
    const result = await putFile(env, path, content, message, author, sha);
    return json({
      ok: true,
      path,
      sha: result.sha,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      htmlUrl: result.htmlUrl,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
};

// DELETE ?path=...&sha=...  （sha 可省，省了我们自己拿）
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const idOrResp = requireIdentity(request);
  if (idOrResp instanceof Response) return idOrResp;
  const id = idOrResp;

  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '';
  if (!isAllowedPath(path) || !path.endsWith('.md')) {
    return json({ error: 'invalid path' }, 400);
  }

  let sha = url.searchParams.get('sha') || '';
  if (!sha) {
    const existing = await getFile(env, path);
    if (!existing) return json({ error: 'not found' }, 404);
    sha = existing.sha;
  }

  const author = authorFromIdentity(id);
  const message = `delete: ${path.replace(/^src\/content\/articles\//, '')} via admin`;
  try {
    const result = await deleteFile(env, path, message, author, sha);
    return json({ ok: true, commitSha: result.commitSha, commitUrl: result.commitUrl });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
};
