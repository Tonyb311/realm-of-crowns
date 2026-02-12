import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  Apple,
  Swords,
  Coins,
  TrendingUp,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import CombatLogViewer from '../combat/CombatLogViewer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyReport {
  id: string;
  tickDate: string;
  sections: {
    food?: {
      consumed?: string;
      hungerState: string;
      spoilageWarnings?: string[];
    };
    action?: {
      type: string;
      outcome: string;
      details?: string;
    };
    combat?: {
      occurred: boolean;
      log?: unknown;
      outcome?: string;
      loot?: { name: string; quantity: number }[];
    };
    economy?: {
      goldEarned?: number;
      goldSpent?: number;
      taxCollected?: number;
      netChange?: number;
    };
    progression?: {
      xpEarned?: number;
      professionXp?: { profession: string; xp: number }[];
      levelUp?: boolean;
      newLevel?: number;
      questProgress?: string[];
    };
    worldNews?: {
      events: { title: string; message: string }[];
    };
  };
  dismissed: boolean;
}

// ---------------------------------------------------------------------------
// Section config
// ---------------------------------------------------------------------------

interface SectionConfig {
  key: string;
  label: string;
  icon: typeof Apple;
  color: string;
}

const SECTIONS: SectionConfig[] = [
  { key: 'food',        label: 'Food & Hunger',   icon: Apple,      color: 'text-realm-success' },
  { key: 'action',      label: 'Action Result',   icon: ScrollText, color: 'text-realm-gold-400' },
  { key: 'combat',      label: 'Combat Log',      icon: Swords,     color: 'text-realm-danger' },
  { key: 'economy',     label: 'Economy',         icon: Coins,      color: 'text-realm-gold-400' },
  { key: 'progression', label: 'Progression',     icon: TrendingUp, color: 'text-realm-teal-300' },
  { key: 'worldNews',   label: 'World News',      icon: Globe,      color: 'text-realm-purple-300' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DailyReportViewProps {
  onDismiss?: () => void;
  asModal?: boolean;
}

export default function DailyReportView({ onDismiss, asModal = false }: DailyReportViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['food', 'action']));

  const { data, isLoading } = useQuery<{ report: DailyReport | null }>({
    queryKey: ['reports', 'latest'],
    queryFn: async () => {
      const res = await api.get('/reports/latest');
      return res.data;
    },
  });

  const report = data?.report;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <ScrollText className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm">No daily report available yet.</p>
        <p className="text-realm-text-muted/60 text-xs mt-1">Reports are generated after each daily tick.</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-realm-gold-400">Daily Report</h2>
          <p className="text-realm-text-muted text-xs">
            {new Date(report.tickDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-realm-text-muted hover:text-realm-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const sectionData = report.sections[section.key as keyof typeof report.sections];
        if (!sectionData) return null;

        // Skip combat if no combat occurred
        if (section.key === 'combat' && !(sectionData as any).occurred) return null;

        const Icon = section.icon;
        const isExpanded = expandedSections.has(section.key);

        return (
          <div key={section.key} className="bg-realm-bg-800 border border-realm-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between p-3 hover:bg-realm-bg-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${section.color}`} />
                <span className={`font-display text-sm ${section.color}`}>{section.label}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-realm-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-realm-text-muted" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 border-t border-realm-border">
                    <SectionContent sectionKey={section.key} data={sectionData} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full py-2.5 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-800 transition-colors"
        >
          Dismiss Report
        </button>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg p-5 w-full max-w-xl max-h-[85vh] overflow-y-auto"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function SectionContent({ sectionKey, data }: { sectionKey: string; data: any }) {
  switch (sectionKey) {
    case 'food':
      return <FoodSection data={data} />;
    case 'action':
      return <ActionSection data={data} />;
    case 'combat':
      return <CombatSection data={data} />;
    case 'economy':
      return <EconomySection data={data} />;
    case 'progression':
      return <ProgressionSection data={data} />;
    case 'worldNews':
      return <WorldNewsSection data={data} />;
    default:
      return <p className="text-realm-text-muted text-xs pt-2">No data.</p>;
  }
}

function FoodSection({ data }: { data: any }) {
  const hungerColors: Record<string, string> = {
    FED: 'text-realm-success',
    HUNGRY: 'text-realm-gold-400',
    STARVING: 'text-realm-danger',
    INCAPACITATED: 'text-realm-danger',
  };

  return (
    <div className="pt-2 space-y-2">
      {data.consumed && (
        <p className="text-realm-text-primary text-xs">
          Consumed: <span className="text-realm-text-secondary font-display">{data.consumed}</span>
        </p>
      )}
      <p className="text-xs">
        Hunger State:{' '}
        <span className={`font-display ${hungerColors[data.hungerState] ?? 'text-realm-text-secondary'}`}>
          {data.hungerState}
        </span>
      </p>
      {data.spoilageWarnings && data.spoilageWarnings.length > 0 && (
        <div className="space-y-1">
          {data.spoilageWarnings.map((w: string, i: number) => (
            <p key={i} className="text-orange-400 text-[10px] flex items-center gap-1">
              <Info className="w-3 h-3" />
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionSection({ data }: { data: any }) {
  return (
    <div className="pt-2 space-y-2">
      <p className="text-xs text-realm-text-muted">
        Action: <span className="text-realm-text-primary font-display">{data.type}</span>
      </p>
      <p className="text-realm-text-primary text-xs">{data.outcome}</p>
      {data.details && (
        <p className="text-realm-text-secondary text-[10px]">{data.details}</p>
      )}
    </div>
  );
}

function CombatSection({ data }: { data: any }) {
  if (!data.occurred) return null;

  return (
    <div className="pt-2 space-y-2">
      {data.outcome && (
        <p className={`font-display text-sm ${
          data.outcome === 'WIN' ? 'text-realm-success'
            : data.outcome === 'LOSS' ? 'text-realm-danger'
            : 'text-realm-gold-400'
        }`}>
          Result: {data.outcome}
        </p>
      )}
      {data.loot && data.loot.length > 0 && (
        <div>
          <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1">Loot</p>
          {data.loot.map((item: any, i: number) => (
            <p key={i} className="text-realm-text-primary text-xs">
              {item.name} x{item.quantity}
            </p>
          ))}
        </div>
      )}
      {data.log && <CombatLogViewer log={data.log} />}
    </div>
  );
}

function EconomySection({ data }: { data: any }) {
  return (
    <div className="pt-2 space-y-1">
      {data.goldEarned != null && data.goldEarned > 0 && (
        <p className="text-realm-success text-xs">+{data.goldEarned} gold earned</p>
      )}
      {data.goldSpent != null && data.goldSpent > 0 && (
        <p className="text-realm-danger text-xs">-{data.goldSpent} gold spent</p>
      )}
      {data.taxCollected != null && data.taxCollected > 0 && (
        <p className="text-realm-gold-400 text-xs">+{data.taxCollected} gold (tax revenue)</p>
      )}
      {data.netChange != null && (
        <p className={`text-xs font-display mt-1 ${data.netChange >= 0 ? 'text-realm-success' : 'text-realm-danger'}`}>
          Net: {data.netChange >= 0 ? '+' : ''}{data.netChange} gold
        </p>
      )}
    </div>
  );
}

function ProgressionSection({ data }: { data: any }) {
  return (
    <div className="pt-2 space-y-2">
      {data.xpEarned != null && data.xpEarned > 0 && (
        <p className="text-realm-teal-300 text-xs">+{data.xpEarned} XP</p>
      )}
      {data.professionXp && data.professionXp.length > 0 && (
        <div>
          {data.professionXp.map((p: any, i: number) => (
            <p key={i} className="text-realm-text-primary text-xs">
              {p.profession}: +{p.xp} XP
            </p>
          ))}
        </div>
      )}
      {data.levelUp && (
        <p className="text-realm-gold-400 font-display text-sm">
          Level Up! Now level {data.newLevel}
        </p>
      )}
      {data.questProgress && data.questProgress.length > 0 && (
        <div>
          <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1">Quests</p>
          {data.questProgress.map((q: string, i: number) => (
            <p key={i} className="text-realm-text-secondary text-xs">{q}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function WorldNewsSection({ data }: { data: any }) {
  if (!data.events || data.events.length === 0) {
    return <p className="text-realm-text-muted text-xs pt-2">No world events today.</p>;
  }

  return (
    <div className="pt-2 space-y-2">
      {data.events.map((evt: any, i: number) => (
        <div key={i} className="border-l-2 border-realm-purple-300/30 pl-3">
          <p className="text-realm-text-primary text-xs font-display">{evt.title}</p>
          <p className="text-realm-text-secondary text-[10px]">{evt.message}</p>
        </div>
      ))}
    </div>
  );
}
