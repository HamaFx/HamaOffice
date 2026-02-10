export type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export function json(body: JsonBody, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(headers ?? {}),
    },
  });
}

export function ok<T extends JsonBody>(data: T, headers?: Record<string, string>): Response {
  return json({ ok: true, data }, 200, headers);
}

export function fail(message: string, status = 400, details?: unknown): Response {
  return json({ ok: false, error: message, details }, status);
}

export function forbidden(message = 'Forbidden'): Response {
  return fail(message, 403);
}
