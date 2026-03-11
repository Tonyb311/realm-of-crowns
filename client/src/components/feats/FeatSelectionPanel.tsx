import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Swords, Sparkles, Hammer, Users, AlertTriangle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface FeatDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  effects: Record<string, unknown>;
  excludedClasses?: string[];
}

interface PendingFeatResponse {
  pending: boolean;
  availableFeats: FeatDefinition[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Swords; border: string; badge: string }> = {
  combat: {
    label: 'Combat',
    icon: Swords,
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300',
  },
  defense: {
    label: 'Defense',
    icon: Shield,
    border: 'border-realm-teal-500/30',
    badge: 'bg-realm-teal-500/20 text-realm-teal-300',
  },
  utility: {
    label: 'Utility',
    icon: Sparkles,
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  exploration: {
    label: 'Exploration',
    icon: Sparkles,
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  crafting: {
    label: 'Crafting & Economy',
    icon: Hammer,
    border: 'border-realm-gold-500/30',
    badge: 'bg-realm-gold-500/20 text-realm-gold-300',
  },
  social: {
    label: 'Social',
    icon: Users,
    border: 'border-green-500/30',
    badge: 'bg-green-500/20 text-green-300',
  },
};

function formatEffects(effects: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(effects)) {
    if (val === undefined || val === null || val === 0 || val === false) continue;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    if (typeof val === 'boolean') {
      parts.push(label);
    } else if (typeof val === 'number') {
      if (val < 1 && val > 0) {
        parts.push(`${label}: +${Math.round(val * 100)}%`);
      } else {
        parts.push(`${label}: ${val > 0 ? '+' : ''}${val}`);
      }
    }
  }
  return parts.join(' | ');
}

export function FeatSelectionModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedFeat, setSelectedFeat] = useState<FeatDefinition | null>(null);
  const [confirmFeat, setConfirmFeat] = useState<FeatDefinition | null>(null);

  const { data, isLoading, error } = useQuery<PendingFeatResponse>({
    queryKey: ['feats', 'pending'],
    queryFn: async () => (await api.get('/characters/pending-feat')).data,
  });

  const chooseMutation = useMutation({
    mutationFn: async (featId: string) => {
      return (await api.post('/characters/choose-feat', { featId })).data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['feats'] });
      toast(`Feat chosen: ${result.feat ?? 'Unknown'}`, {
        duration: 5000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
      onClose();
    },
    onError: (err: any) => {
      toast(err?.response?.data?.error ?? 'Failed to choose feat', {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #ef4444' },
      });
    },
  });

  if (!data?.pending && !isLoading) {
    return null;
  }

  // Group feats by category
  const grouped = new Map<string, FeatDefinition[]>();
  for (const feat of data?.availableFeats ?? []) {
    const cat = feat.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(feat);
  }

  const categoryOrder = ['combat', 'defense', 'utility', 'exploration', 'crafting', 'social'];
  const sortedCategories = [...grouped.entries()].sort(
    (a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-realm-bg-800 border-2 border-realm-gold-500/50 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-realm-gold-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-realm-border/30 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-realm-text-muted hover:text-realm-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-display text-realm-gold-400">Choose Your Feat</h2>
          <p className="text-sm text-realm-text-muted mt-1">
            This is a permanent choice — choose wisely.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-400">
              Failed to load feats. Please try again.
            </div>
          )}

          {sortedCategories.map(([category, feats]) => {
            const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.utility;
            const Icon = config.icon;
            return (
              <div key={category}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${config.border}`}>
                  <Icon className="w-4 h-4 text-realm-text-muted" />
                  <h3 className="font-display text-sm text-realm-text-primary uppercase tracking-wider">
                    {config.label}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {feats.map((feat) => {
                    const isSelected = selectedFeat?.id === feat.id;
                    return (
                      <button
                        key={feat.id}
                        onClick={() => setSelectedFeat(isSelected ? null : feat)}
                        className={`text-left rounded-sm p-3 border transition-all duration-200 ${
                          isSelected
                            ? 'border-realm-gold-400/60 bg-realm-gold-500/10 shadow-lg shadow-realm-gold-500/5'
                            : 'border-realm-border/30 bg-realm-bg-700 hover:border-realm-border/60 hover:bg-realm-bg-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-display text-sm text-realm-text-primary">{feat.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-realm-text-secondary leading-relaxed mb-2">
                          {feat.description}
                        </p>
                        <div className="text-[10px] text-realm-text-muted">
                          {formatEffects(feat.effects)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-realm-border/30 flex items-center justify-between">
          <div className="text-xs text-realm-text-muted">
            {selectedFeat ? (
              <span>Selected: <span className="text-realm-gold-300">{selectedFeat.name}</span></span>
            ) : (
              'Click a feat to select it'
            )}
          </div>
          <button
            onClick={() => selectedFeat && setConfirmFeat(selectedFeat)}
            disabled={!selectedFeat}
            className={`px-6 py-2 font-display text-sm rounded-sm transition-all ${
              selectedFeat
                ? 'bg-realm-gold-500 text-realm-bg-900 hover:bg-realm-gold-400'
                : 'bg-realm-bg-700 text-realm-text-muted cursor-not-allowed'
            }`}
          >
            Choose This Feat
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmFeat && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70"
          onClick={() => setConfirmFeat(null)}
        >
          <div
            className="bg-realm-bg-800 border-2 border-realm-gold-500 rounded-lg p-6 max-w-sm w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className="w-10 h-10 text-realm-gold-400 mx-auto mb-3" />
            <h3 className="text-lg font-display text-realm-gold-400 mb-2">Confirm Feat Selection</h3>
            <p className="text-sm text-realm-text-secondary mb-4">
              You are about to choose <span className="text-realm-text-primary font-semibold">{confirmFeat.name}</span>.
              This choice is permanent and cannot be changed.
            </p>
            <div className="bg-realm-bg-900 rounded-sm p-3 mb-4 text-left">
              <div className="text-xs text-realm-text-secondary">{confirmFeat.description}</div>
              <div className="text-[10px] text-realm-text-muted mt-1">{formatEffects(confirmFeat.effects)}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmFeat(null)}
                className="flex-1 py-2 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => chooseMutation.mutate(confirmFeat.id)}
                disabled={chooseMutation.isPending}
                className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors disabled:opacity-50"
              >
                {chooseMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirm Selection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
