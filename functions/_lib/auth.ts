// 取登录用户邮箱：生产环境从 Cloudflare Access 注入的 header 读，
// 本地 wrangler dev 没这 header 时给一个开发占位邮箱。

export interface Identity {
  email: string;
  dev: boolean;
}

const HEADER = 'Cf-Access-Authenticated-User-Email';
const DEV_EMAIL = 'dev@local';

// 简单的环境检测：本地 wrangler dev 时 host 形如 127.0.0.1 / localhost。
function isLocalRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

export function getIdentity(request: Request): Identity | null {
  const email = request.headers.get(HEADER);
  if (email) return { email, dev: false };
  if (isLocalRequest(request)) return { email: DEV_EMAIL, dev: true };
  return null;
}

export function requireIdentity(request: Request): Identity | Response {
  const id = getIdentity(request);
  if (!id) {
    return json({ error: 'Unauthorized' }, 401);
  }
  return id;
}

export function authorFromIdentity(id: Identity): { name: string; email: string } {
  // 用 @ 前的部分当 commit 显示名，简单粗暴
  const name = id.email.split('@')[0] || id.email;
  return { name, email: id.email };
}

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

// 防路径穿越：写入 / 删除 / 读 都只允许在 src/content/articles/ 或 public/uploads/ 下
const ALLOWED_PREFIXES = ['src/content/articles/', 'public/uploads/'];

export function isAllowedPath(path: string): boolean {
  if (!path) return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
