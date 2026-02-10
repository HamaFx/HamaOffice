import { useEffect, useMemo, useState } from 'react';
import type { AgentOfficeRole, AgentOfficeRuntimeStatus, OfficeTheme } from '../types';
import type { OfficeDensity } from './virtualOfficeOptions';
import { useOfficeLiveState } from '../hooks/useOfficeLiveState';
import { useOfficeSimulation } from '../hooks/useOfficeSimulation';
import {
  VirtualOfficeControls,
  VirtualOfficeHero,
  VirtualOfficeOverview,
  VirtualOfficeScenePanel,
  VirtualOfficeSidebar,
} from '../components/virtual-office';

export default function VirtualOffice() {
  const { envelope, timeline, loading, refreshing, error, refresh } = useOfficeLiveState();
  const scene = envelope?.scene ?? null;
  const workspace = envelope?.workspace ?? null;
  const { agents } = useOfficeSimulation(scene);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AgentOfficeRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentOfficeRuntimeStatus>('all');
  const [density, setDensity] = useState<OfficeDensity>('balanced');
  const [theme, setTheme] = useState<OfficeTheme>('night');

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agents.filter((agent) => {
      if (roleFilter !== 'all' && agent.role !== roleFilter) return false;
      if (statusFilter !== 'all' && agent.runtimeStatus !== statusFilter) return false;
      if (!query) return true;

      return (
        agent.displayName.toLowerCase().includes(query) ||
        agent.identity.callsign.toLowerCase().includes(query) ||
        agent.agentId.toLowerCase().includes(query)
      );
    });
  }, [agents, roleFilter, search, statusFilter]);

  useEffect(() => {
    if (!filteredAgents.length) {
      setSelectedAgentId(null);
      return;
    }

    if (!selectedAgentId) {
      setSelectedAgentId(filteredAgents[0].agentId);
      return;
    }

    const exists = filteredAgents.some((agent) => agent.agentId === selectedAgentId);
    if (!exists) {
      setSelectedAgentId(filteredAgents[0].agentId);
    }
  }, [filteredAgents, selectedAgentId]);

  const selectedAgent = useMemo(
    () => filteredAgents.find((agent) => agent.agentId === selectedAgentId) ?? null,
    [filteredAgents, selectedAgentId],
  );

  const selectedTask = useMemo(() => {
    if (!scene || !selectedAgent?.currentTaskId) return null;
    return scene.tasks.find((task) => task.task_id === selectedAgent.currentTaskId) ?? null;
  }, [scene, selectedAgent]);

  const onlineCount = useMemo(
    () => agents.filter((agent) => agent.runtimeStatus === 'online').length,
    [agents],
  );

  const blockedCount = useMemo(
    () => (scene ? scene.tasks.filter((task) => task.status.toLowerCase().includes('blocked')).length : 0),
    [scene],
  );

  const criticalAlerts = useMemo(
    () => (scene ? scene.alerts.filter((alert) => alert.severity === 'critical').length : 0),
    [scene],
  );

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDensity('balanced');
  };

  return (
    <div className={`virtual-office-root vo-page virtual-office-theme-${theme}`}>
      <VirtualOfficeHero
        scene={scene}
        onlineCount={onlineCount}
        blockedCount={blockedCount}
        criticalAlerts={criticalAlerts}
        refreshing={refreshing}
        onRefresh={refresh}
        error={error}
        theme={theme}
      />

      <VirtualOfficeOverview
        totalAgents={agents.length}
        filteredAgents={filteredAgents.length}
        criticalAlerts={criticalAlerts}
        workspace={workspace}
      />

      <VirtualOfficeControls
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        density={density}
        theme={theme}
        onSearchChange={setSearch}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
        onDensityChange={setDensity}
        onThemeChange={setTheme}
        onReset={resetFilters}
      />

      {!scene ? (
        <section className="panel">
          <div className="empty">{loading ? 'Loading virtual office state...' : 'No scene data available.'}</div>
        </section>
      ) : (
        <section className="virtual-layout vo-layout">
          <VirtualOfficeScenePanel
            scene={scene}
            agents={filteredAgents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            density={density}
            theme={theme}
          />

          <VirtualOfficeSidebar
            selectedAgent={selectedAgent}
            selectedTask={selectedTask}
            timeline={timeline}
            filteredAgents={filteredAgents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />
        </section>
      )}

      {workspace && (
        <section className="panel virtual-footer-metrics vo-footer">
          <h3>Workspace Quality Snapshot</h3>
          <div className="metric-grid">
            <div>
              <small>Total Tasks</small>
              <strong>{workspace.metrics.total_tasks}</strong>
            </div>
            <div>
              <small>Pass Rate</small>
              <strong>{Math.round(workspace.metrics.pass_rate * 100)}%</strong>
            </div>
            <div>
              <small>Avg Review Loops</small>
              <strong>{workspace.metrics.avg_review_loops.toFixed(1)}</strong>
            </div>
            <div>
              <small>Avg Attempts</small>
              <strong>{workspace.metrics.avg_attempts.toFixed(1)}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
