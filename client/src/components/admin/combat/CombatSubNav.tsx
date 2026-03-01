import { BarChart3, BookOpen, History, FlaskConical } from 'lucide-react';

export type CombatTab = 'overview' | 'codex' | 'history' | 'simulator';

const TABS: { key: CombatTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'codex', label: 'Codex', icon: BookOpen },
  { key: 'history', label: 'History', icon: History },
  { key: 'simulator', label: 'Simulator', icon: FlaskConical },
];

interface CombatSubNavProps {
  activeTab: CombatTab;
  onTabChange: (tab: CombatTab) => void;
}

export default function CombatSubNav({ activeTab, onTabChange }: CombatSubNavProps) {
  return (
    <div className="border-b border-realm-border mb-6">
      <nav className="flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-realm-gold-500 text-realm-gold-400'
                  : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-border/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
