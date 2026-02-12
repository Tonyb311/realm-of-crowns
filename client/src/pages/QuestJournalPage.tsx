import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScrollText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  Coins,
  Star,
  Trash2,
  Check,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { RealmButton } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QuestObjective {
  type: string;
  description: string;
  target: string;
  required: number;
  current: number;
}

interface QuestRewards {
  xp: number;
  gold: number;
  items?: { name: string; quantity: number }[];
}

interface Quest {
  id: string;
  name: string;
  description: string;
  type: string;
  level: number;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  npcName?: string;
  acceptedAt?: string;
  completedAt?: string;
  progress?: Record<string, unknown>;
}

type Tab = 'active' | 'available' | 'completed';

// ---------------------------------------------------------------------------
// Quest type colors
// ---------------------------------------------------------------------------
const QUEST_TYPE_COLORS: Record<string, string> = {
  MAIN: 'bg-realm-gold-500/15 text-realm-gold-400 border-realm-gold-500/30',
  TOWN: 'bg-realm-teal-300/10 text-realm-teal-300 border-realm-teal-300/30',
  DAILY: 'bg-realm-success/10 text-realm-success border-realm-success/30',
  GUILD: 'bg-realm-purple-300/10 text-realm-purple-300 border-realm-purple-300/30',
  BOUNTY: 'bg-realm-danger/10 text-realm-danger border-realm-danger/30',
  RACIAL: 'bg-realm-gold-400/10 text-realm-gold-400 border-realm-gold-400/30',
};

function getQuestTypeBadge(type: string) {
  const cls = QUEST_TYPE_COLORS[type] ?? 'bg-realm-bg-600/40 text-realm-text-secondary border-realm-border';
  return `text-[10px] px-2 py-0.5 rounded border font-display uppercase tracking-wider ${cls}`;
}

// ---------------------------------------------------------------------------
// Quest Card
// ---------------------------------------------------------------------------
function QuestCard({
  quest,
  mode,
  onAccept,
  onAbandon,
  onComplete,
  isPending,
}: {
  quest: Quest;
  mode: 'active' | 'available' | 'completed';
  onAccept?: () => void;
  onAbandon?: () => void;
  onComplete?: () => void;
  isPending?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const allObjectivesMet = mode === 'active' && quest.objectives.every((o) => o.current >= o.required);

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-realm-bg-600/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ScrollText className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-realm-text-primary text-sm truncate">{quest.name}</h3>
              <span className={getQuestTypeBadge(quest.type)}>{quest.type}</span>
            </div>
            {quest.npcName && (
              <p className="text-realm-text-muted text-xs mt-0.5">{quest.npcName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-realm-text-muted text-xs">Lv. {quest.level}</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-realm-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-realm-text-muted" />
          )}
        </div>
      </button>

      {/* Objective progress bars (always visible for active quests) */}
      {mode === 'active' && !expanded && (
        <div className="px-5 pb-3 space-y-1.5">
          {quest.objectives.map((obj, i) => {
            const pct = obj.required > 0 ? Math.min(100, (obj.current / obj.required) * 100) : 0;
            const done = obj.current >= obj.required;
            return (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={done ? 'text-realm-success' : 'text-realm-text-muted'}>{obj.description}</span>
                  <span className={done ? 'text-realm-success' : 'text-realm-text-secondary'}>
                    {obj.current}/{obj.required}
                  </span>
                </div>
                <div className="h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-realm-success' : 'bg-realm-gold-500/70'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-realm-border pt-4">
          <p className="text-realm-text-secondary text-sm leading-relaxed">{quest.description}</p>

          {/* Objectives */}
          <div>
            <h4 className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-2 font-display">
              Objectives
            </h4>
            <ul className="space-y-2">
              {quest.objectives.map((obj, i) => {
                const pct = obj.required > 0 ? Math.min(100, (obj.current / obj.required) * 100) : 0;
                const done = obj.current >= obj.required;
                return (
                  <li key={i}>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Target className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-realm-success' : 'text-realm-text-muted'}`} />
                      <span className={done ? 'text-realm-success' : 'text-realm-text-primary'}>
                        {obj.description}
                      </span>
                      {mode !== 'completed' && (
                        <span className={`ml-auto text-xs ${done ? 'text-realm-success' : 'text-realm-text-muted'}`}>
                          {obj.current}/{obj.required}
                        </span>
                      )}
                    </div>
                    {mode === 'active' && (
                      <div className="h-1.5 bg-realm-bg-900 rounded-full overflow-hidden ml-5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-realm-success' : 'bg-realm-gold-500/70'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Rewards */}
          <div>
            <h4 className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-2 font-display">
              Rewards
            </h4>
            <div className="flex flex-wrap gap-2">
              {quest.rewards.xp > 0 && (
                <span className="flex items-center gap-1 text-xs bg-realm-bg-800 rounded px-2.5 py-1">
                  <Star className="w-3 h-3 text-realm-success" />
                  <span className="text-realm-success font-display">{quest.rewards.xp} XP</span>
                </span>
              )}
              {quest.rewards.gold > 0 && (
                <span className="flex items-center gap-1 text-xs bg-realm-bg-800 rounded px-2.5 py-1">
                  <Coins className="w-3 h-3 text-realm-gold-400" />
                  <span className="text-realm-gold-400 font-display">{quest.rewards.gold} Gold</span>
                </span>
              )}
              {quest.rewards.items?.map((item, i) => (
                <span key={i} className="text-xs bg-realm-bg-800 rounded px-2.5 py-1 text-realm-text-primary">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>

          {/* Completed date */}
          {mode === 'completed' && quest.completedAt && (
            <div className="flex items-center gap-1.5 text-xs text-realm-text-muted">
              <Clock className="w-3 h-3" />
              Completed {new Date(quest.completedAt).toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          {mode === 'active' && (
            <div className="flex gap-3 pt-2">
              {allObjectivesMet && onComplete && (
                <RealmButton
                  variant="primary"
                  size="sm"
                  onClick={onComplete}
                  disabled={isPending}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Turn In
                </RealmButton>
              )}
              {onAbandon && (
                <RealmButton
                  variant="danger"
                  size="sm"
                  onClick={onAbandon}
                  disabled={isPending}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Abandon
                </RealmButton>
              )}
            </div>
          )}

          {mode === 'available' && onAccept && (
            <RealmButton
              variant="primary"
              onClick={onAccept}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Accept Quest
            </RealmButton>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function QuestJournalPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const { data: activeQuests, isLoading: activeLoading } = useQuery<Quest[]>({
    queryKey: ['quests', 'active'],
    queryFn: async () => {
      const res = await api.get('/quests/active');
      return res.data.quests ?? res.data;
    },
    enabled: activeTab === 'active',
  });

  const { data: availableQuests, isLoading: availableLoading } = useQuery<Quest[]>({
    queryKey: ['quests', 'available'],
    queryFn: async () => {
      const res = await api.get('/quests/available');
      return res.data.quests ?? res.data;
    },
    enabled: activeTab === 'available',
  });

  const { data: completedQuests, isLoading: completedLoading } = useQuery<Quest[]>({
    queryKey: ['quests', 'completed'],
    queryFn: async () => {
      const res = await api.get('/quests/completed');
      return res.data.quests ?? res.data;
    },
    enabled: activeTab === 'completed',
  });

  const acceptMutation = useMutation({
    mutationFn: async (questId: string) => (await api.post('/quests/accept', { questId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      toast('Quest accepted!', {
        duration: 3000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async (questId: string) => (await api.post('/quests/abandon', { questId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (questId: string) => (await api.post('/quests/complete', { questId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast('Quest completed!', {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
    },
  });

  // Group available quests by type
  const groupedAvailable: Record<string, Quest[]> = {};
  if (availableQuests) {
    for (const q of availableQuests) {
      if (!groupedAvailable[q.type]) groupedAvailable[q.type] = [];
      groupedAvailable[q.type].push(q);
    }
  }

  const QUEST_TYPE_ORDER = ['MAIN', 'TOWN', 'DAILY', 'GUILD', 'BOUNTY', 'RACIAL'];
  const sortedGroups = Object.entries(groupedAvailable).sort(
    (a, b) => (QUEST_TYPE_ORDER.indexOf(a[0]) ?? 99) - (QUEST_TYPE_ORDER.indexOf(b[0]) ?? 99)
  );

  const isLoading =
    (activeTab === 'active' && activeLoading) ||
    (activeTab === 'available' && availableLoading) ||
    (activeTab === 'completed' && completedLoading);

  return (
    <div>
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-realm-gold-400" />
            <div>
              <h1 className="text-3xl font-display text-realm-gold-400">Quest Journal</h1>
              <p className="text-realm-text-muted text-sm">Track your adventures and available quests</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-realm-border bg-realm-bg-800/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {([
              { key: 'active' as Tab, label: 'Active Quests', count: activeQuests?.length },
              { key: 'available' as Tab, label: 'Available', count: availableQuests?.length },
              { key: 'completed' as Tab, label: 'Completed', count: completedQuests?.length },
            ]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                  ${activeTab === key
                    ? 'border-realm-gold-500 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-primary hover:border-realm-text-muted/30'}`}
              >
                {label}
                {count != null && count > 0 && (
                  <span className="text-[10px] bg-realm-bg-700 border border-realm-border rounded-full px-1.5 py-0.5 text-realm-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            ))}
          </div>
        ) : activeTab === 'active' ? (
          <div className="space-y-3">
            {!activeQuests || activeQuests.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-realm-text-muted/20 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">No active quests. Check the Available tab to find quests.</p>
              </div>
            ) : (
              activeQuests.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  mode="active"
                  onAbandon={() => abandonMutation.mutate(q.id)}
                  onComplete={() => completeMutation.mutate(q.id)}
                  isPending={abandonMutation.isPending || completeMutation.isPending}
                />
              ))
            )}
          </div>
        ) : activeTab === 'available' ? (
          <div className="space-y-6">
            {sortedGroups.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-realm-text-muted/20 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">No available quests right now. Check back later.</p>
              </div>
            ) : (
              sortedGroups.map(([type, quests]) => (
                <div key={type}>
                  <h3 className="font-display text-realm-text-secondary text-sm mb-3 flex items-center gap-2">
                    <span className={getQuestTypeBadge(type)}>{type}</span>
                    <span className="text-realm-text-muted text-xs">{quests.length} quest{quests.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <div className="space-y-3">
                    {quests.map((q) => (
                      <QuestCard
                        key={q.id}
                        quest={q}
                        mode="available"
                        onAccept={() => acceptMutation.mutate(q.id)}
                        isPending={acceptMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!completedQuests || completedQuests.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-realm-text-muted/20 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">No completed quests yet. Your adventure is just beginning.</p>
              </div>
            ) : (
              completedQuests.map((q) => (
                <QuestCard key={q.id} quest={q} mode="completed" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
