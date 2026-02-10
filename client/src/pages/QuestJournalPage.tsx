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
import { SkeletonCard } from '../components/ui/LoadingSkeleton';

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
  MAIN: 'bg-primary-400/20 text-primary-400 border-primary-400/30',
  TOWN: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
  DAILY: 'bg-green-900/30 text-green-400 border-green-500/30',
  GUILD: 'bg-purple-900/30 text-purple-400 border-purple-500/30',
  BOUNTY: 'bg-red-900/30 text-red-400 border-red-500/30',
  RACIAL: 'bg-amber-900/30 text-amber-400 border-amber-500/30',
};

function getQuestTypeBadge(type: string) {
  const cls = QUEST_TYPE_COLORS[type] ?? 'bg-dark-50/40 text-parchment-300 border-dark-50';
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
    <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-dark-200/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ScrollText className="w-5 h-5 text-primary-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-parchment-200 text-sm truncate">{quest.name}</h3>
              <span className={getQuestTypeBadge(quest.type)}>{quest.type}</span>
            </div>
            {quest.npcName && (
              <p className="text-parchment-500 text-xs mt-0.5">{quest.npcName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-parchment-500 text-xs">Lv. {quest.level}</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-parchment-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-parchment-500" />
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
                  <span className={done ? 'text-green-400' : 'text-parchment-500'}>{obj.description}</span>
                  <span className={done ? 'text-green-400' : 'text-parchment-400'}>
                    {obj.current}/{obj.required}
                  </span>
                </div>
                <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-green-500' : 'bg-primary-400/70'}`}
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
        <div className="px-5 pb-5 space-y-4 border-t border-dark-50 pt-4">
          <p className="text-parchment-300 text-sm leading-relaxed">{quest.description}</p>

          {/* Objectives */}
          <div>
            <h4 className="text-parchment-500 text-[10px] uppercase tracking-wider mb-2 font-display">
              Objectives
            </h4>
            <ul className="space-y-2">
              {quest.objectives.map((obj, i) => {
                const pct = obj.required > 0 ? Math.min(100, (obj.current / obj.required) * 100) : 0;
                const done = obj.current >= obj.required;
                return (
                  <li key={i}>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Target className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-green-400' : 'text-parchment-500'}`} />
                      <span className={done ? 'text-green-400' : 'text-parchment-200'}>
                        {obj.description}
                      </span>
                      {mode !== 'completed' && (
                        <span className={`ml-auto text-xs ${done ? 'text-green-400' : 'text-parchment-500'}`}>
                          {obj.current}/{obj.required}
                        </span>
                      )}
                    </div>
                    {mode === 'active' && (
                      <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden ml-5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-green-500' : 'bg-primary-400/70'}`}
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
            <h4 className="text-parchment-500 text-[10px] uppercase tracking-wider mb-2 font-display">
              Rewards
            </h4>
            <div className="flex flex-wrap gap-2">
              {quest.rewards.xp > 0 && (
                <span className="flex items-center gap-1 text-xs bg-dark-500 rounded px-2.5 py-1">
                  <Star className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 font-display">{quest.rewards.xp} XP</span>
                </span>
              )}
              {quest.rewards.gold > 0 && (
                <span className="flex items-center gap-1 text-xs bg-dark-500 rounded px-2.5 py-1">
                  <Coins className="w-3 h-3 text-primary-400" />
                  <span className="text-primary-400 font-display">{quest.rewards.gold} Gold</span>
                </span>
              )}
              {quest.rewards.items?.map((item, i) => (
                <span key={i} className="text-xs bg-dark-500 rounded px-2.5 py-1 text-parchment-200">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>

          {/* Completed date */}
          {mode === 'completed' && quest.completedAt && (
            <div className="flex items-center gap-1.5 text-xs text-parchment-500">
              <Clock className="w-3 h-3" />
              Completed {new Date(quest.completedAt).toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          {mode === 'active' && (
            <div className="flex gap-3 pt-2">
              {allObjectivesMet && onComplete && (
                <button
                  onClick={onComplete}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Turn In
                </button>
              )}
              {onAbandon && (
                <button
                  onClick={onAbandon}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-500/40 text-red-400 font-display text-sm rounded hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Abandon
                </button>
              )}
            </div>
          )}

          {mode === 'available' && onAccept && (
            <button
              onClick={onAccept}
              disabled={isPending}
              className="px-6 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Accept Quest
            </button>
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
    queryFn: async () => (await api.get('/quests/active')).data,
    enabled: activeTab === 'active',
  });

  const { data: availableQuests, isLoading: availableLoading } = useQuery<Quest[]>({
    queryKey: ['quests', 'available'],
    queryFn: async () => (await api.get('/quests/available')).data,
    enabled: activeTab === 'available',
  });

  const { data: completedQuests, isLoading: completedLoading } = useQuery<Quest[]>({
    queryKey: ['quests', 'completed'],
    queryFn: async () => (await api.get('/quests/completed')).data,
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
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-3xl font-display text-primary-400">Quest Journal</h1>
              <p className="text-parchment-500 text-sm">Track your adventures and available quests</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-dark-50 bg-dark-400/30">
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
                    ? 'border-primary-400 text-primary-400'
                    : 'border-transparent text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30'}`}
              >
                {label}
                {count != null && count > 0 && (
                  <span className="text-[10px] bg-dark-300 border border-dark-50 rounded-full px-1.5 py-0.5 text-parchment-400">
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
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activeTab === 'active' ? (
          <div className="space-y-3">
            {!activeQuests || activeQuests.length === 0 ? (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-parchment-500/20 mx-auto mb-3" />
                <p className="text-parchment-500 text-sm">No active quests. Check the Available tab to find quests.</p>
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
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-parchment-500/20 mx-auto mb-3" />
                <p className="text-parchment-500 text-sm">No available quests right now. Check back later.</p>
              </div>
            ) : (
              sortedGroups.map(([type, quests]) => (
                <div key={type}>
                  <h3 className="font-display text-parchment-300 text-sm mb-3 flex items-center gap-2">
                    <span className={getQuestTypeBadge(type)}>{type}</span>
                    <span className="text-parchment-500 text-xs">{quests.length} quest{quests.length !== 1 ? 's' : ''}</span>
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
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-12 text-center">
                <ScrollText className="w-12 h-12 text-parchment-500/20 mx-auto mb-3" />
                <p className="text-parchment-500 text-sm">No completed quests yet. Your adventure is just beginning.</p>
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
