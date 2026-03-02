import { useState, lazy, Suspense } from 'react';
import CombatSubNav, { type CombatTab } from '../../components/admin/combat/CombatSubNav';
import RunSelector from '../../components/admin/combat/RunSelector';

const OverviewTab = lazy(() => import('../../components/admin/combat/OverviewTab'));
const CodexTab = lazy(() => import('../../components/admin/combat/CodexTab'));
const HistoryTab = lazy(() => import('../../components/admin/combat/HistoryTab'));
const SimulatorTab = lazy(() => import('../../components/admin/combat/SimulatorTab'));

export type DataSource = 'live' | 'sim' | 'all';

const DATA_SOURCE_OPTIONS: { value: DataSource; label: string; description: string }[] = [
  { value: 'live', label: 'Live', description: 'Player data only' },
  { value: 'sim', label: 'Simulation', description: 'Bot simulation data' },
  { value: 'all', label: 'All', description: 'All data sources' },
];

export default function AdminCombatPage() {
  const [activeTab, setActiveTab] = useState<CombatTab>('overview');
  const [dataSource, setDataSource] = useState<DataSource>('live');

  // Run selection state (only relevant when dataSource === 'sim')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [compareRunId, setCompareRunId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const activeOption = DATA_SOURCE_OPTIONS.find((o) => o.value === dataSource)!;

  function handleDataSourceChange(value: DataSource) {
    setDataSource(value);
    // Clear run selection when switching away from sim
    if (value !== 'sim') {
      setSelectedRunId(null);
      setCompareRunId(null);
      setCompareMode(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-realm-gold-400">Combat Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-realm-border">
            {DATA_SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDataSourceChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-display transition-colors ${
                  dataSource === opt.value
                    ? 'bg-realm-gold-500 text-realm-bg-900'
                    : 'bg-realm-bg-700 text-realm-text-secondary hover:text-realm-text-primary hover:bg-realm-bg-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-realm-text-muted">{activeOption.description}</span>
        </div>
      </div>

      {/* Run selector — only visible in simulation mode */}
      {dataSource === 'sim' && (
        <div className="mb-4">
          <RunSelector
            selectedRunId={selectedRunId}
            compareRunId={compareRunId}
            compareMode={compareMode}
            onSelectRun={setSelectedRunId}
            onSelectCompareRun={setCompareRunId}
            onToggleCompare={setCompareMode}
          />
        </div>
      )}

      <CombatSubNav activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
      }>
        {activeTab === 'overview' && (
          <OverviewTab
            dataSource={dataSource}
            runId={selectedRunId}
            compareRunId={compareMode ? compareRunId : null}
          />
        )}
        {activeTab === 'codex' && <CodexTab />}
        {activeTab === 'history' && (
          <HistoryTab dataSource={dataSource} runId={selectedRunId} />
        )}
        {activeTab === 'simulator' && <SimulatorTab />}
      </Suspense>
    </div>
  );
}
