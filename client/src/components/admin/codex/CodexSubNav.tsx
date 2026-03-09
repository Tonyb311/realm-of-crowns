import { Users, Skull, Map } from 'lucide-react';

export type CodexTab = 'races-classes' | 'monsters' | 'encounters';

const TABS: { key: CodexTab; label: string; icon: typeof Users }[] = [
  { key: 'races-classes', label: 'Races & Classes', icon: Users },
  { key: 'monsters', label: 'Monsters', icon: Skull },
  { key: 'encounters', label: 'Encounters', icon: Map },
];

interface CodexSubNavProps {
  activeTab: CodexTab;
  onTabChange: (tab: CodexTab) => void;
}

export default function CodexSubNav({ activeTab, onTabChange }: CodexSubNavProps) {
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
