import { useState, lazy, Suspense } from 'react';
import CombatSubNav, { type CombatTab } from '../../components/admin/combat/CombatSubNav';

const OverviewTab = lazy(() => import('../../components/admin/combat/OverviewTab'));
const CodexTab = lazy(() => import('../../components/admin/combat/CodexTab'));
const HistoryTab = lazy(() => import('../../components/admin/combat/HistoryTab'));
const SimulatorTab = lazy(() => import('../../components/admin/combat/SimulatorTab'));

export default function AdminCombatPage() {
  const [activeTab, setActiveTab] = useState<CombatTab>('overview');

  return (
    <div>
      <h1 className="text-2xl font-display text-realm-gold-400 mb-6">Combat Dashboard</h1>
      <CombatSubNav activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
      }>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'codex' && <CodexTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'simulator' && <SimulatorTab />}
      </Suspense>
    </div>
  );
}
