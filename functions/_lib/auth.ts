// 取登录用户邮箱：
// 1) 优先从 CF Access 的 Cf-Access-Authenticated-User-Email header 读
// 2) 没有就从 Cf-Access-Jwt-Assertion 解 JWT 拿 email（CF 默认会塞 JWT）
// 3) 本地 wrangler dev 给一个开发占位邮箱

export interface Identity {
  email: string;
  dev: boolean;
}

const EMAIL_HEADER = 'Cf-Access-Authenticated-User-Email';
const JWT_HEADER = 'Cf-Access-Jwt-Assertion';
const DEV_EMAIL = 'dev@local';

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

function isProtectedHost(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const host = url.hostname;
    // 只信任正经域名（CF Access 在它前面）；防止有人通过 *.pages.dev 直连绕过 Access
    return host === 'sakuapi.com' || host === 'www.sakuapi.com';
  } catch {
    return false;
  }
}

function base64UrlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}

function emailFromJWT(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    const email = (payload.email as string)
      || ((payload.identity as Record<string, unknown> | undefined)?.email as string)
      || null;
    return email && typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

export function getIdentity(request: Request): Identity | null {
  const headerEmail = request.headers.get(EMAIL_HEADER);
  if (headerEmail) return { email: headerEmail, dev: false };

  const jwt = request.headers.get(JWT_HEADER);
  if (jwt && isProtectedHost(request)) {
    const email = emailFromJWT(jwt);
    if (email) return { email, dev: false };
  }

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

const ALLOWED_PREFIXES = ['src/content/articles/', 'public/uploads/'];

export function isAllowedPath(path: string): boolean {
  if (!path) return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
