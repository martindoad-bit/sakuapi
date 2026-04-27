// 轻量 PagesFunction 类型，避免拉 @cloudflare/workers-types 这个大包。
// 仅供 functions/ 目录使用，参考 https://developers.cloudflare.com/pages/functions/typescript/

declare global {
  type PagesFunction<
    Env = Record<string, unknown>,
    Params extends string = string,
    Data extends Record<string, unknown> = Record<string, unknown>,
  > = (context: {
    request: Request;
    functionPath: string;
    env: Env;
    params: Record<Params, string | string[]>;
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    data: Data;
  }) => Response | Promise<Response>;
}

export {};
