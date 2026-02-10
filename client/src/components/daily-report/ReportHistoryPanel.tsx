import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryReport {
  id: string;
  tickDate: string;
  sections: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportHistoryPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ reports: HistoryReport[] }>({
    queryKey: ['reports', 'history'],
    queryFn: async () => {
      const res = await api.get('/reports/history?limit=7');
      return res.data;
    },
  });

  const reports = data?.reports ?? [];

  if (isLoading) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Calendar className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">No past reports.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
      <h3 className="font-display text-primary-400 text-sm flex items-center gap-2 mb-4">
        <ScrollText className="w-4 h-4" />
        Report History
      </h3>

      <div className="space-y-2">
        {reports.map((report) => {
          const isExpanded = expandedId === report.id;
          const date = new Date(report.tickDate);

          return (
            <div key={report.id} className="border border-dark-50 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-dark-400/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-200 text-xs font-display">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-parchment-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-parchment-500" />
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
                    <div className="px-3 pb-3 border-t border-dark-50">
                      <ReportSummary sections={report.sections} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report summary (minimal display for history)
// ---------------------------------------------------------------------------

function ReportSummary({ sections }: { sections: Record<string, unknown> }) {
  const entries = Object.entries(sections).filter(([, v]) => v != null);

  if (entries.length === 0) {
    return <p className="text-parchment-500 text-xs pt-2">No details recorded.</p>;
  }

  return (
    <div className="pt-2 space-y-2">
      {entries.map(([key, val]) => {
        const data = val as Record<string, unknown>;
        return (
          <div key={key}>
            <p className="text-[10px] text-parchment-500 uppercase tracking-wider">{formatSectionKey(key)}</p>
            <SummarizedSection sectionKey={key} data={data} />
          </div>
        );
      })}
    </div>
  );
}

function SummarizedSection({ sectionKey, data }: { sectionKey: string; data: Record<string, unknown> }) {
  switch (sectionKey) {
    case 'food':
      return (
        <p className="text-parchment-300 text-xs">
          {data.consumed ? `Ate ${data.consumed}` : 'No food consumed'} — {String(data.hungerState ?? 'unknown')}
        </p>
      );
    case 'action':
      return (
        <p className="text-parchment-300 text-xs">
          {String(data.type ?? '')}: {String(data.outcome ?? '')}
        </p>
      );
    case 'combat':
      if (!(data as any).occurred) return <p className="text-parchment-500 text-xs">No combat</p>;
      return <p className="text-parchment-300 text-xs">Combat: {String(data.outcome ?? 'unknown')}</p>;
    case 'economy':
      return (
        <p className={`text-xs ${(data.netChange as number) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Net: {(data.netChange as number) >= 0 ? '+' : ''}{String(data.netChange ?? 0)} gold
        </p>
      );
    case 'progression':
      return (
        <p className="text-parchment-300 text-xs">
          {data.xpEarned ? `+${data.xpEarned} XP` : 'No XP'}
          {data.levelUp ? ` — Level Up to ${data.newLevel}!` : ''}
        </p>
      );
    case 'worldNews': {
      const events = (data.events as any[]) ?? [];
      return <p className="text-parchment-300 text-xs">{events.length} world event(s)</p>;
    }
    default:
      return <p className="text-parchment-500 text-xs">-</p>;
  }
}

function formatSectionKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}
