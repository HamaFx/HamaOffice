import { Clock3, GitBranch, ShieldCheck, Wrench } from 'lucide-react';
import type { AgentOfficeTask } from '../../types';

interface DashboardQueueBoardProps {
  tasks: AgentOfficeTask[];
  taskStatusTone: (status: string) => string;
  shortTask: (task: AgentOfficeTask) => string;
  formatAgo: (timestamp: string | null) => string;
}

export function DashboardQueueBoard({ tasks, taskStatusTone, shortTask, formatAgo }: DashboardQueueBoardProps) {
  return (
    <article className="panel dashboard-panel">
      <h3>
        <GitBranch size={18} /> Queue Board
      </h3>
      {tasks.length === 0 ? (
        <div className="empty">No queue tasks captured yet.</div>
      ) : (
        <div className="task-list">
          {tasks.slice(0, 10).map((task) => (
            <div key={task.task_id} className="task-card">
              <div className="chips">
                <span className={`chip ${taskStatusTone(task.status)}`}>{task.status}</span>
                <span className="chip chip-slate">{task.priority}</span>
                <span className="task-owner">{task.owner}</span>
              </div>
              <p>{shortTask(task)}</p>
              <div className="task-meta">
                <span>
                  <Wrench size={13} /> Attempts {task.attempts}
                </span>
                <span>
                  <ShieldCheck size={13} /> Reviews {task.review_loops}
                </span>
                <span>
                  <Clock3 size={13} /> {formatAgo(task.updated_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
