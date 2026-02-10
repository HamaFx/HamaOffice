import { getAgentOfficeWorkspaceSnapshot, hasAgentOfficeAccess } from './_lib/agentOffice.js';
import { forbidden, ok } from './_lib/http.js';

export async function GET(request: Request) {
  if (!hasAgentOfficeAccess(request)) {
    return forbidden('Agent Office access denied');
  }
  const data = await getAgentOfficeWorkspaceSnapshot();
  return ok({
    total_tasks: data.metrics.total_tasks,
    pass_rate: data.metrics.pass_rate,
    status_counts: data.metrics.status_counts,
    avg_lead_time_ms: data.metrics.avg_lead_time_ms,
    avg_attempts: data.metrics.avg_attempts,
    avg_review_loops: data.metrics.avg_review_loops,
    total_cost_usd: data.metrics.total_cost_usd,
    avg_cost_usd: data.metrics.avg_cost_usd,
    top_failure_causes: data.metrics.top_failure_causes,
  });
}
