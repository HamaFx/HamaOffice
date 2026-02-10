import { Filter, Moon, Palette, RotateCcw, Search, Signal, Sun, Workflow } from 'lucide-react';
import type { AgentOfficeRole, AgentOfficeRuntimeStatus, OfficeTheme } from '../../types';
import {
  densityOptions,
  roleOptions,
  statusOptions,
  themeOptions,
  type OfficeDensity,
} from '../../pages/virtualOfficeOptions';

interface VirtualOfficeControlsProps {
  search: string;
  roleFilter: 'all' | AgentOfficeRole;
  statusFilter: 'all' | AgentOfficeRuntimeStatus;
  density: OfficeDensity;
  theme: OfficeTheme;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: 'all' | AgentOfficeRole) => void;
  onStatusFilterChange: (value: 'all' | AgentOfficeRuntimeStatus) => void;
  onDensityChange: (value: OfficeDensity) => void;
  onThemeChange: (value: OfficeTheme) => void;
  onReset: () => void;
}

function iconForTheme(theme: OfficeTheme) {
  if (theme === 'day') return <Sun size={13} />;
  if (theme === 'night') return <Moon size={13} />;
  return <Palette size={13} />;
}

export function VirtualOfficeControls({
  search,
  roleFilter,
  statusFilter,
  density,
  theme,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onDensityChange,
  onThemeChange,
  onReset,
}: VirtualOfficeControlsProps) {
  return (
    <section className="panel virtual-controls vo-controls">
      <div className="control-inline">
        <label>
          <Search size={14} /> Search
        </label>
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="agent, callsign, id"
        />
      </div>

      <div className="control-inline">
        <label>
          <Filter size={14} /> Role
        </label>
        <select value={roleFilter} onChange={(event) => onRoleFilterChange(event.target.value as 'all' | AgentOfficeRole)}>
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-inline">
        <label>
          <Signal size={14} /> Runtime
        </label>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as 'all' | AgentOfficeRuntimeStatus)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-inline">
        <label>
          <Workflow size={14} /> Density
        </label>
        <select value={density} onChange={(event) => onDensityChange(event.target.value as OfficeDensity)}>
          {densityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-inline control-inline-wide">
        <label>Scene Theme</label>
        <div className="theme-switch-row">
          {themeOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`theme-switch-btn ${theme === option.value ? 'theme-switch-btn-active' : ''}`}
              onClick={() => onThemeChange(option.value)}
            >
              {iconForTheme(option.value)} {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-inline control-inline-actions">
        <label>Actions</label>
        <button type="button" className="btn-soft" onClick={onReset}>
          <RotateCcw size={14} /> Reset Filters
        </button>
      </div>
    </section>
  );
}
