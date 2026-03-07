import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Trash2, GitCompare, X } from 'lucide-react';
import api from '../../../services/api';

interface SimulationRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  tickCount: number;
  ticksCompleted: number;
  botCount: number;
  encounterCount: number;
  status: string;
  notes: string | null;
  archived: boolean;
}

interface RunSelectorProps {
  selectedRunId: string | null;
  compareRunId: string | null;
  compareMode: boolean;
  onSelectRun: (runId: string | null) => void;
  onSelectCompareRun: (runId: string | null) => void;
  onToggleCompare: (enabled: boolean) => void;
}

function formatRunLabel(run: SimulationRun): string {
  const date = new Date(run.startedAt);
  const month = date.toLocaleString('en', { month: 'short' });
  const day = date.getDate();
  const ticks = run.ticksCompleted || run.tickCount;
  const bots = run.botCount;
  const enc = run.encounterCount;
  const status = run.status !== 'completed' ? ` [${run.status}]` : '';
  return `${month} ${day} — ${ticks} ticks, ${bots} bots (${enc} encounters)${status}`;
}

export default function RunSelector({
  selectedRunId,
  compareRunId,
  compareMode,
  onSelectRun,
  onSelectCompareRun,
  onToggleCompare,
}: RunSelectorProps) {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ runs: SimulationRun[] }>({
    queryKey: ['admin', 'simulation', 'runs', { showArchived }],
    queryFn: async () => {
      const params = showArchived ? '?includeArchived=true' : '';
      return (await api.get(`/admin/simulation/runs${params}`)).data;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (runId: string) => api.post(`/admin/simulation/runs/${runId}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'simulation', 'runs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => api.delete(`/admin/simulation/runs/${runId}`),
    onSuccess: (_, runId) => {
      if (selectedRunId === runId) onSelectRun(null);
      if (compareRunId === runId) onSelectCompareRun(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation', 'runs'] });
    },
  });

  const notesMutation = useMutation({
    mutationFn: ({ runId, notes }: { runId: string; notes: string }) =>
      api.patch(`/admin/simulation/runs/${runId}`, { notes: notes || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'simulation', 'runs'] }),
  });

  const runs = data?.runs ?? [];
  const selectedRun = runs.find(r => r.id === selectedRunId);

  function handleNotesBlur(runId: string) {
    notesMutation.mutate({ runId, notes: notesValue });
    setEditingNotesId(null);
  }

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Primary run selector */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-xs text-realm-text-muted whitespace-nowrap font-display">
            {compareMode ? 'Run A:' : 'Run:'}
          </label>
          <select
            value={selectedRunId ?? ''}
            onChange={e => onSelectRun(e.target.value || null)}
            className="flex-1 bg-realm-bg-800 border border-realm-border rounded-sm px-2 py-1.5 text-xs text-realm-text-primary"
          >
            <option value="">All Simulation Data</option>
            {runs.map(run => (
              <option key={run.id} value={run.id}>
                {run.archived ? '[Archived] ' : ''}{formatRunLabel(run)}
              </option>
            ))}
          </select>
        </div>

        {/* Compare mode selector */}
        {compareMode && (
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-realm-text-muted whitespace-nowrap font-display">Run B:</label>
            <select
              value={compareRunId ?? ''}
              onChange={e => onSelectCompareRun(e.target.value || null)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded-sm px-2 py-1.5 text-xs text-realm-text-primary"
            >
              <option value="">Select run to compare...</option>
              {runs.filter(r => r.id !== selectedRunId).map(run => (
                <option key={run.id} value={run.id}>
                  {run.archived ? '[Archived] ' : ''}{formatRunLabel(run)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleCompare(!compareMode)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-sm text-xs transition-colors ${
              compareMode
                ? 'bg-realm-purple-500/20 text-realm-purple-400 border border-realm-purple-500/30'
                : 'bg-realm-bg-800 text-realm-text-secondary hover:text-realm-text-primary border border-realm-border'
            }`}
            title="Compare two runs"
          >
            <GitCompare size={12} />
            Compare
          </button>

          <label className="flex items-center gap-1 text-xs text-realm-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded-sm border-realm-border bg-realm-bg-800"
            />
            Archived
          </label>
        </div>
      </div>

      {/* Selected run details + actions */}
      {selectedRun && (
        <div className="flex items-center gap-2 pt-1 border-t border-realm-border/50">
          {/* Inline notes */}
          <div className="flex-1 min-w-0">
            {editingNotesId === selectedRun.id ? (
              <input
                autoFocus
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onBlur={() => handleNotesBlur(selectedRun.id)}
                onKeyDown={e => { if (e.key === 'Enter') handleNotesBlur(selectedRun.id); if (e.key === 'Escape') setEditingNotesId(null); }}
                placeholder="Add notes..."
                className="w-full bg-realm-bg-800 border border-realm-border rounded-sm px-2 py-1 text-xs text-realm-text-primary"
              />
            ) : (
              <button
                onClick={() => { setEditingNotesId(selectedRun.id); setNotesValue(selectedRun.notes ?? ''); }}
                className="text-xs text-realm-text-muted hover:text-realm-text-secondary truncate max-w-full text-left"
                title="Click to edit notes"
              >
                {selectedRun.notes || 'Click to add notes...'}
              </button>
            )}
          </div>

          {/* Archive toggle */}
          <button
            onClick={() => archiveMutation.mutate(selectedRun.id)}
            disabled={archiveMutation.isPending}
            className="p-1 rounded-sm text-realm-text-muted hover:text-realm-warning transition-colors"
            title={selectedRun.archived ? 'Unarchive' : 'Archive'}
          >
            {selectedRun.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>

          {/* Delete with confirmation */}
          {confirmDeleteId === selectedRun.id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { deleteMutation.mutate(selectedRun.id); setConfirmDeleteId(null); }}
                className="px-2 py-0.5 rounded-sm text-xs bg-realm-danger/20 text-realm-danger border border-realm-danger/30 hover:bg-realm-danger/30"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="p-0.5 text-realm-text-muted hover:text-realm-text-primary"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteId(selectedRun.id)}
              className="p-1 rounded-sm text-realm-text-muted hover:text-realm-danger transition-colors"
              title="Delete run"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="text-xs text-realm-text-muted animate-pulse">Loading runs...</div>
      )}
      {!isLoading && runs.length === 0 && (
        <div className="text-xs text-realm-text-muted">No simulation runs found. Run a simulation to see runs here.</div>
      )}
    </div>
  );
}
