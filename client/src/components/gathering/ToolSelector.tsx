import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wrench, Loader2, Check } from 'lucide-react';
import api from '../../services/api';
import type { EquippedTool } from './ToolSlot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InventoryTool {
  itemId: string;
  name: string;
  tier: string;
  toolType: string;
  durability: number;
  maxDurability: number;
  speedBonus: number;
  yieldBonus: number;
  rarity: string;
  professionType: string;
}

interface ToolSelectorProps {
  professionType: string;
  currentTool: EquippedTool | null;
  onClose: () => void;
  onEquipped: () => void;
}

// ---------------------------------------------------------------------------
// Tier badge colors (shared with ToolSlot)
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<string, string> = {
  CRUDE:       'bg-gray-600 text-gray-200',
  COPPER:      'bg-orange-800 text-orange-200',
  IRON:        'bg-slate-500 text-slate-100',
  STEEL:       'bg-blue-700 text-blue-100',
  MITHRIL:     'bg-purple-700 text-purple-100',
  ADAMANTINE:  'bg-amber-600 text-amber-100',
};

function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function durabilityColor(ratio: number): string {
  if (ratio > 0.5) return 'bg-green-500';
  if (ratio > 0.25) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ToolSelector({ professionType, currentTool, onClose, onEquipped }: ToolSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Fetch tools in inventory that match the profession
  const { data: tools, isLoading } = useQuery<InventoryTool[]>({
    queryKey: ['tools', 'inventory', professionType],
    queryFn: async () => {
      const res = await api.get(`/tools/inventory?professionType=${professionType}`);
      return res.data;
    },
  });

  const equipMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.post('/tools/equip', { itemId, professionType });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools', 'equipped'] });
      queryClient.invalidateQueries({ queryKey: ['tools', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      onEquipped();
      onClose();
    },
  });

  const unequipMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tools/unequip', { professionType });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools', 'equipped'] });
      queryClient.invalidateQueries({ queryKey: ['tools', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      onEquipped();
      onClose();
    },
  });

  const isMutating = equipMutation.isPending || unequipMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative bg-dark-400 border border-dark-50 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary-400" />
            <h3 className="font-display text-primary-400 text-lg">Select Tool</h3>
          </div>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            </div>
          ) : !tools || tools.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-8 h-8 text-parchment-500/30 mx-auto mb-2" />
              <p className="text-parchment-500 text-sm">No tools available for this profession.</p>
              <p className="text-parchment-500/60 text-xs mt-1">Craft or buy tools from the market.</p>
            </div>
          ) : (
            <>
              {tools.map((tool) => {
                const isCurrentlyEquipped = currentTool?.itemId === tool.itemId;
                const isSelected = selectedItemId === tool.itemId;
                const ratio = tool.maxDurability > 0 ? tool.durability / tool.maxDurability : 0;
                const tierBadge = TIER_COLORS[tool.tier] ?? TIER_COLORS.CRUDE;

                return (
                  <button
                    key={tool.itemId}
                    onClick={() => setSelectedItemId(tool.itemId)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      isCurrentlyEquipped
                        ? 'border-green-500/50 bg-green-900/10'
                        : isSelected
                          ? 'border-primary-400 bg-primary-400/10'
                          : 'border-dark-50 bg-dark-300 hover:border-dark-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-parchment-200 font-display">{tool.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-display ${tierBadge}`}>
                          {tierLabel(tool.tier)}
                        </span>
                        {isCurrentlyEquipped && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-display flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            Equipped
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-green-400">
                        +{Math.round(tool.speedBonus * 100)}% speed
                      </span>
                      <span className="text-[10px] text-blue-400">
                        +{Math.round(tool.yieldBonus * 100)}% yield
                      </span>
                    </div>

                    {/* Durability bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-500 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${durabilityColor(ratio)}`}
                          style={{ width: `${Math.max(2, ratio * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-parchment-500">
                        {tool.durability}/{tool.maxDurability}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-dark-50">
          {currentTool && (
            <button
              onClick={() => unequipMutation.mutate()}
              disabled={isMutating}
              className="flex-1 py-2.5 border border-red-500/30 text-red-400 font-display text-sm rounded hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {unequipMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Unequip
            </button>
          )}
          <button
            onClick={() => {
              if (selectedItemId) equipMutation.mutate(selectedItemId);
            }}
            disabled={!selectedItemId || isMutating || currentTool?.itemId === selectedItemId}
            className="flex-1 py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {equipMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Equip
          </button>
        </div>

        {(equipMutation.isError || unequipMutation.isError) && (
          <p className="text-red-400 text-xs text-center pb-3">
            {(equipMutation.error as Error)?.message || (unequipMutation.error as Error)?.message || 'Failed. Please try again.'}
          </p>
        )}
      </div>
    </div>
  );
}
