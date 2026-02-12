import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ScrollText, Coins, Star } from 'lucide-react';
import api from '../services/api';

interface QuestObjective {
  type: 'KILL' | 'GATHER' | 'DELIVER' | 'TALK' | 'VISIT';
  description: string;
  target: string;
  required: number;
}

interface QuestRewards {
  xp: number;
  gold: number;
  items?: { name: string; quantity: number }[];
}

export interface QuestOffer {
  id: string;
  name: string;
  description: string;
  type: string;
  level: number;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  npcName?: string;
}

interface QuestDialogProps {
  quest: QuestOffer;
  onClose: () => void;
  onAccepted?: () => void;
}

const OBJECTIVE_VERBS: Record<string, string> = {
  KILL: 'Defeat',
  GATHER: 'Collect',
  DELIVER: 'Deliver',
  TALK: 'Speak to',
  VISIT: 'Visit',
};

export default function QuestDialog({ quest, onClose, onAccepted }: QuestDialogProps) {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/quests/accept', { questId: quest.id })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      onAccepted?.();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-realm-bg-800 border border-realm-border rounded-lg max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-realm-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border border-realm-gold-500/30 bg-realm-gold-500/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-realm-gold-400" />
            </div>
            <div>
              {quest.npcName && (
                <p className="text-realm-text-muted text-xs">{quest.npcName}</p>
              )}
              <h3 className="font-display text-realm-gold-400 text-lg">{quest.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-realm-text-muted uppercase tracking-wider">
                  {quest.type}
                </span>
                <span className="text-[10px] text-realm-text-muted">Lv. {quest.level}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-realm-text-secondary text-sm leading-relaxed">{quest.description}</p>

          {/* Objectives */}
          <div>
            <h4 className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-2 font-display">
              Objectives
            </h4>
            <ul className="space-y-1.5">
              {quest.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-realm-text-muted mt-0.5">-</span>
                  <span className="text-realm-text-primary">
                    {OBJECTIVE_VERBS[obj.type] ?? obj.type} {obj.target}
                    {obj.required > 1 && ` (${obj.required})`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rewards */}
          <div>
            <h4 className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-2 font-display">
              Rewards
            </h4>
            <div className="flex flex-wrap gap-3">
              {quest.rewards.xp > 0 && (
                <div className="flex items-center gap-1.5 text-sm bg-realm-bg-900 rounded px-3 py-1.5">
                  <Star className="w-3.5 h-3.5 text-realm-success" />
                  <span className="text-realm-success font-display">{quest.rewards.xp} XP</span>
                </div>
              )}
              {quest.rewards.gold > 0 && (
                <div className="flex items-center gap-1.5 text-sm bg-realm-bg-900 rounded px-3 py-1.5">
                  <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
                  <span className="text-realm-gold-400 font-display">{quest.rewards.gold} Gold</span>
                </div>
              )}
              {quest.rewards.items?.map((item, i) => (
                <div key={i} className="text-sm bg-realm-bg-900 rounded px-3 py-1.5 text-realm-text-primary">
                  {item.name} x{item.quantity}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-realm-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {acceptMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Accept Quest
          </button>
        </div>

        {acceptMutation.isError && (
          <p className="text-realm-danger text-xs text-center pb-3">
            Failed to accept quest. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
