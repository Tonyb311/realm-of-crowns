import { useState, lazy, Suspense } from 'react';
import CodexSubNav, { type CodexTab } from '../../components/admin/codex/CodexSubNav';

const RacesClassesTab = lazy(() => import('../../components/admin/codex/RacesClassesTab'));
const MonstersTab = lazy(() => import('../../components/admin/codex/MonstersTab'));
const EncountersTab = lazy(() => import('../../components/admin/codex/EncountersTab'));

export default function AdminCodexPage() {
  const [activeTab, setActiveTab] = useState<CodexTab>('races-classes');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-realm-gold-400">Codex</h1>
        <p className="text-realm-text-muted text-sm mt-1">
          Game reference data — races, classes, abilities, monsters, encounters
        </p>
      </div>

      <CodexSubNav activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
      }>
        {activeTab === 'races-classes' && <RacesClassesTab />}
        {activeTab === 'monsters' && <MonstersTab />}
        {activeTab === 'encounters' && <EncountersTab />}
      </Suspense>
    </div>
  );
}
