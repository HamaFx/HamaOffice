import { ShieldCheck, TimerReset, Users2, Wrench } from 'lucide-react';

interface DashboardStatsProps {
  onlineAgents: number;
  pendingTasks: number;
  passRatePct: number;
  avgLeadTimeLabel: string;
}

export function DashboardStats({ onlineAgents, pendingTasks, passRatePct, avgLeadTimeLabel }: DashboardStatsProps) {
  return (
    <section className="dashboard-stats-grid">
      <article className="stat-card">
        <p>Agents Online</p>
        <h2>{onlineAgents}</h2>
        <Users2 size={18} />
      </article>
      <article className="stat-card">
        <p>Open Tasks</p>
        <h2>{pendingTasks}</h2>
        <Wrench size={18} />
      </article>
      <article className="stat-card">
        <p>Pass Rate</p>
        <h2>{passRatePct}%</h2>
        <ShieldCheck size={18} />
      </article>
      <article className="stat-card">
        <p>Avg Lead Time</p>
        <h2>{avgLeadTimeLabel}</h2>
        <TimerReset size={18} />
      </article>
    </section>
  );
}
