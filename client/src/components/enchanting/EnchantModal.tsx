import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import api from '../../services/api';
import { RealmModal, RealmButton } from '../ui/realm-index';
import { ENCHANTMENT_EFFECTS, type EnchantmentEffect } from '@shared/data/enchantment-effects';

interface ItemTemplate {
  id: string;
  name: string;
  type: string;
  rarity: string;
  stats: Record<string, unknown> | null;
}

interface InventoryItem {
  id: string;
  templateId: string;
  template: ItemTemplate;
  quantity: number;
  currentDurability: number;
  quality: string;
  enchantments: Array<{ scrollName: string; bonuses: Record<string, number> }>;
}

interface EnchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: InventoryItem;
  inventory: InventoryItem[];
}

export function EnchantModal({ isOpen, onClose, targetItem, inventory }: EnchantModalProps) {
  const queryClient = useQueryClient();
  const [selectedScrollId, setSelectedScrollId] = useState<string | null>(null);

  const enchantMutation = useMutation({
    mutationFn: (data: { scrollItemId: string; targetItemId: string }) =>
      api.post('/api/equipment/enchant', data).then(r => r.data),
    onSuccess: (data: { message: string }) => {
      toast.success(data.message || 'Enchantment applied!');
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      onClose();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to apply enchantment');
    },
  });

  // Find all enchantment scrolls in inventory
  const scrolls = useMemo(() => {
    return inventory.filter(item => item.template.name.includes('Enchantment Scroll'));
  }, [inventory]);

  // Existing enchantment names on target
  const existingEnchantNames = useMemo(() => {
    const enchants = targetItem.enchantments || [];
    return enchants.map(e => e.scrollName);
  }, [targetItem.enchantments]);

  const existingCount = (targetItem.enchantments || []).length;

  // Check if a scroll can be applied
  function getScrollStatus(scroll: InventoryItem): { canApply: boolean; reason?: string } {
    const effect = ENCHANTMENT_EFFECTS[scroll.template.name];
    if (!effect) return { canApply: false, reason: 'Unknown enchantment' };

    if (existingCount >= 2) return { canApply: false, reason: 'Max 2 enchantments reached' };
    if (existingEnchantNames.includes(scroll.template.name)) {
      return { canApply: false, reason: 'Already applied' };
    }

    const targetType = targetItem.template.type;
    if (effect.targetType === 'weapon' && targetType !== 'WEAPON') {
      return { canApply: false, reason: 'Weapons only' };
    }
    if (effect.targetType === 'armor' && targetType !== 'ARMOR') {
      return { canApply: false, reason: 'Armor only' };
    }

    return { canApply: true };
  }

  const selectedScroll = scrolls.find(s => s.id === selectedScrollId);
  const selectedEffect = selectedScroll ? ENCHANTMENT_EFFECTS[selectedScroll.template.name] : null;

  function handleApply() {
    if (!selectedScrollId) return;
    enchantMutation.mutate({ scrollItemId: selectedScrollId, targetItemId: targetItem.id });
  }

  return (
    <RealmModal isOpen={isOpen} onClose={onClose} title="Enchant Item" className="max-w-2xl">
      <div className="space-y-4">
        {/* Target item info */}
        <div className="bg-realm-bg-800 rounded-lg p-3 border border-realm-gold-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-gold font-display text-sm">{targetItem.template.name}</span>
          </div>
          <p className="text-xs text-realm-text-muted">
            {targetItem.template.type} &middot; {existingCount}/2 enchantments
          </p>
          {existingCount > 0 && (
            <div className="mt-2 space-y-1">
              {(targetItem.enchantments || []).map((ench, i) => (
                <div key={i} className="text-xs text-realm-purple-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {ench.scrollName.replace(' Enchantment Scroll', '')}
                  <span className="text-realm-text-muted ml-1">
                    ({Object.entries(ench.bonuses).map(([k, v]) => `+${v} ${formatStatName(k)}`).join(', ')})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll selection */}
        <div>
          <h4 className="text-xs text-realm-text-muted uppercase tracking-wider mb-2">
            Available Scrolls ({scrolls.length})
          </h4>
          {scrolls.length === 0 ? (
            <p className="text-sm text-realm-text-muted italic">No enchantment scrolls in inventory</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {scrolls.map(scroll => {
                const status = getScrollStatus(scroll);
                const effect = ENCHANTMENT_EFFECTS[scroll.template.name];
                const isSelected = selectedScrollId === scroll.id;

                return (
                  <button
                    key={scroll.id}
                    onClick={() => status.canApply && setSelectedScrollId(scroll.id)}
                    disabled={!status.canApply}
                    className={`w-full text-left px-3 py-2 rounded-sm border transition-colors ${
                      isSelected
                        ? 'border-realm-gold-500 bg-realm-gold-500/10'
                        : status.canApply
                          ? 'border-realm-border hover:border-realm-gold-500/50 bg-realm-bg-800'
                          : 'border-realm-border/50 bg-realm-bg-900 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isSelected ? 'text-realm-gold-400' : 'text-realm-text-primary'}`}>
                        {scroll.template.name.replace(' Enchantment Scroll', '')}
                      </span>
                      <div className="flex items-center gap-2">
                        {scroll.quantity > 1 && (
                          <span className="text-xs text-realm-text-muted">x{scroll.quantity}</span>
                        )}
                        {!status.canApply && (
                          <span className="text-xs text-realm-danger">{status.reason}</span>
                        )}
                      </div>
                    </div>
                    {effect && (
                      <p className="text-xs text-realm-text-muted mt-0.5">
                        {Object.entries(effect.bonuses).map(([k, v]) => `+${v} ${formatStatName(k)}`).join(', ')}
                        {effect.elementalDamage && ` (${effect.elementalDamage.toLowerCase()})`}
                        {' '}&middot; {effect.targetType === 'any' ? 'any equipment' : `${effect.targetType}s only`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview */}
        {selectedEffect && (
          <div className="bg-realm-bg-800 rounded-lg p-3 border border-realm-gold-500/20">
            <h4 className="text-xs text-realm-text-muted uppercase tracking-wider mb-2">Enchantment Preview</h4>
            <div className="space-y-1">
              {Object.entries(selectedEffect.bonuses).map(([stat, value]) => (
                <div key={stat} className="flex justify-between text-sm">
                  <span className="text-realm-text-secondary capitalize">{formatStatName(stat)}</span>
                  <span className="text-realm-success">+{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <RealmButton
            variant="primary"
            className="flex-1"
            onClick={handleApply}
            disabled={!selectedScrollId || enchantMutation.isPending}
          >
            {enchantMutation.isPending ? 'Enchanting...' : 'Apply Enchantment'}
          </RealmButton>
          <RealmButton variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </RealmButton>
        </div>
      </div>
    </RealmModal>
  );
}

function formatStatName(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}
