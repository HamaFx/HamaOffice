import { getAgentOfficeWorkspaceSnapshot, hasAgentOfficeAccess } from './_lib/agentOffice.js';
import { forbidden, ok } from './_lib/http.js';

export async function GET(request: Request) {
  if (!hasAgentOfficeAccess(request)) {
    return forbidden('Agent Office access denied');
  }
  const data = await getAgentOfficeWorkspaceSnapshot();
  return ok({
    generated_at: data.generated_at,
    sources: data.sources,
    agents: data.agents,
    tasks: data.tasks,
    metrics: data.metrics,
  });
}
