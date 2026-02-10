function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ', 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

function getHeaderToken(request: Request, key: string): string | null {
  const value = request.headers.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractToken(request: Request, headerName: string): string | null {
  return getHeaderToken(request, headerName) ?? getBearerToken(request);
}

export function hasReadAccess(request: Request): boolean {
  const expected = process.env.AGENT_OFFICE_READ_TOKEN;
  if (!expected) return true;
  const provided = extractToken(request, 'x-agent-office-token');
  return provided === expected;
}

export function hasIngestAccess(request: Request): boolean {
  const expected = process.env.AGENT_OFFICE_INGEST_TOKEN;
  if (!expected) return true;
  const provided = extractToken(request, 'x-agent-office-ingest-token');
  return provided === expected;
}
