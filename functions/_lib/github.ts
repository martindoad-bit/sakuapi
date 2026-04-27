// GitHub Contents API helpers for CF Pages Functions.
// 用 fetch 直连 https://api.github.com，避免 octokit 这种重型依赖。

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // owner/repo
}

export interface Author {
  name: string;
  email: string;
}

interface GitHubError {
  message: string;
  documentation_url?: string;
}

const API = 'https://api.github.com';
const UA = 'sakuapi-admin/1.0';

function authHeaders(env: Env): HeadersInit {
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured');
  }
  if (!env.GITHUB_REPO || !env.GITHUB_REPO.includes('/')) {
    throw new Error('GITHUB_REPO must be set to "owner/repo"');
  }
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': UA,
  };
}

function repoUrl(env: Env, suffix: string): string {
  return `${API}/repos/${env.GITHUB_REPO}${suffix}`;
}

async function ghJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const msg = (body as GitHubError | null)?.message || `GitHub ${res.status}`;
    const err = new Error(`GitHub API error: ${msg}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

// ---------- base64 helpers (Cloudflare Workers / browser) ----------

function utf8ToBase64(text: string): string {
  // TextEncoder available in Workers runtime
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return btoa(bin);
}

// ---------- public API ----------

export interface FileResult {
  path: string;
  sha: string;
  content: string; // utf-8 decoded
  size: number;
}

export async function getFile(env: Env, path: string): Promise<FileResult | null> {
  const res = await fetch(repoUrl(env, `/contents/${encodeContentPath(path)}`), {
    headers: authHeaders(env),
  });
  if (res.status === 404) return null;
  const data = await ghJson<{
    path: string;
    sha: string;
    size: number;
    content: string;
    encoding: string;
  }>(res);
  if (data.encoding !== 'base64') {
    throw new Error(`Unexpected encoding: ${data.encoding}`);
  }
  return {
    path: data.path,
    sha: data.sha,
    size: data.size,
    content: base64ToUtf8(data.content),
  };
}

export interface PutResult {
  sha: string;
  commitSha: string;
  commitUrl: string;
  htmlUrl: string;
}

export async function putFile(
  env: Env,
  path: string,
  contentUtf8: string,
  message: string,
  author: Author,
  sha?: string,
): Promise<PutResult> {
  return putFileBase64(env, path, utf8ToBase64(contentUtf8), message, author, sha);
}

export async function putFileBytes(
  env: Env,
  path: string,
  bytes: Uint8Array,
  message: string,
  author: Author,
  sha?: string,
): Promise<PutResult> {
  return putFileBase64(env, path, bytesToBase64(bytes), message, author, sha);
}

async function putFileBase64(
  env: Env,
  path: string,
  contentBase64: string,
  message: string,
  author: Author,
  sha?: string,
): Promise<PutResult> {
  const body: Record<string, unknown> = {
    message,
    content: contentBase64,
    author: { name: author.name, email: author.email },
    committer: { name: author.name, email: author.email },
  };
  if (sha) body.sha = sha;
  const res = await fetch(repoUrl(env, `/contents/${encodeContentPath(path)}`), {
    method: 'PUT',
    headers: { ...authHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await ghJson<{
    content: { sha: string; html_url: string };
    commit: { sha: string; html_url: string };
  }>(res);
  return {
    sha: data.content.sha,
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url,
    htmlUrl: data.content.html_url,
  };
}

export async function deleteFile(
  env: Env,
  path: string,
  message: string,
  author: Author,
  sha: string,
): Promise<{ commitSha: string; commitUrl: string }> {
  const res = await fetch(repoUrl(env, `/contents/${encodeContentPath(path)}`), {
    method: 'DELETE',
    headers: { ...authHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sha,
      author: { name: author.name, email: author.email },
      committer: { name: author.name, email: author.email },
    }),
  });
  const data = await ghJson<{ commit: { sha: string; html_url: string } }>(res);
  return { commitSha: data.commit.sha, commitUrl: data.commit.html_url };
}

export interface DirEntry {
  type: 'file' | 'dir';
  name: string;
  path: string;
  sha: string;
  size: number;
}

export async function listDir(env: Env, path: string): Promise<DirEntry[]> {
  const res = await fetch(repoUrl(env, `/contents/${encodeContentPath(path)}`), {
    headers: authHeaders(env),
  });
  if (res.status === 404) return [];
  const data = await ghJson<DirEntry[] | DirEntry>(res);
  return Array.isArray(data) ? data : [data];
}

// 递归列目录（用 git tree API 一次拉到底，比 contents 递归省请求）
export interface TreeFile {
  path: string;
  sha: string;
  size: number;
}

export async function listTreeFiles(
  env: Env,
  prefix: string,
  ref?: string,
): Promise<TreeFile[]> {
  const branch = ref || 'HEAD';
  // 先拿 branch 的 commit -> tree sha
  const refRes = await fetch(repoUrl(env, `/commits/${encodeURIComponent(branch)}`), {
    headers: authHeaders(env),
  });
  const commit = await ghJson<{ commit: { tree: { sha: string } } }>(refRes);
  const treeSha = commit.commit.tree.sha;
  const treeRes = await fetch(
    repoUrl(env, `/git/trees/${treeSha}?recursive=1`),
    { headers: authHeaders(env) },
  );
  const tree = await ghJson<{
    tree: { path: string; type: string; sha: string; size?: number }[];
    truncated: boolean;
  }>(treeRes);
  const cleanPrefix = prefix.replace(/\/$/, '');
  return tree.tree
    .filter((node) => node.type === 'blob' && node.path.startsWith(cleanPrefix + '/'))
    .map((node) => ({ path: node.path, sha: node.sha, size: node.size || 0 }));
}

// path 里的中文要编码，但 / 要保留
function encodeContentPath(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}
