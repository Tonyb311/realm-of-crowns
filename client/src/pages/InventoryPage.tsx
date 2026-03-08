import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Shield,
  Swords,
  Crown,
  Shirt,
  Wrench,
  Coins,
  X,
  ChevronRight,
  Hand,
  Footprints,
  Gem,
  CircleDot,
} from 'lucide-react';
import api from '../services/api';
import { getRarityStyle, TOAST_STYLE } from '../constants';
import toast from 'react-hot-toast';
import { RealmButton } from '../components/ui/realm-index';
import { EnchantModal } from '../components/enchanting/EnchantModal';
import { Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ItemTemplate {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  stats: Record<string, unknown> | null;
  durability: number;
}

interface InventoryItem {
  id: string;
  templateId: string;
  template: ItemTemplate;
  quantity: number;
  currentDurability: number;
  quality: string;
  craftedById: string | null;
  craftedByName?: string;
  enchantments: Array<{ scrollName: string; bonuses: Record<string, number> }>;
}

interface EquippedItemData {
  slot: string;
  item: {
    id: string;
    name: string;
    type: string;
    quality: string;
    currentDurability: number;
    maxDurability: number;
    stats: Record<string, unknown>;
    baseStats?: Record<string, unknown>;
    enchantments?: Array<{ scrollName: string; bonuses: Record<string, number> }>;
  };
}

interface EquipmentStats {
  totalAC: number;
  totalDamage: number;
  totalStatBonuses: Record<string, number>;
  totalResistances: Record<string, number>;
  equippedCount: number;
}

interface CharacterData {
  id: string;
  name: string;
  gold: number;
  inventory: InventoryItem[];
}

// ---------------------------------------------------------------------------
// Item type icons
// ---------------------------------------------------------------------------
const TYPE_ICONS: Record<string, typeof Package> = {
  WEAPON: Swords,
  ARMOR: Shield,
  TOOL: Wrench,
  CONSUMABLE: Package,
  MATERIAL: Package,
};

function getTypeIcon(type: string) {
  return TYPE_ICONS[type] ?? Package;
}

// ---------------------------------------------------------------------------
// Equipment slot definitions (all 12 slots)
// ---------------------------------------------------------------------------
interface SlotDef {
  key: string;    // DB EquipSlot value
  label: string;
  icon: typeof Shield;
}

const PRIMARY_SLOTS: SlotDef[] = [
  { key: 'HEAD',      label: 'Head',     icon: Crown },
  { key: 'NECK',      label: 'Neck',     icon: Gem },
  { key: 'BACK',      label: 'Back',     icon: Shield },
  { key: 'CHEST',     label: 'Body',     icon: Shirt },
  { key: 'MAIN_HAND', label: 'Weapon',   icon: Swords },
  { key: 'OFF_HAND',  label: 'Off Hand', icon: Shield },
  { key: 'HANDS',     label: 'Hands',    icon: Hand },
  { key: 'RING_1',    label: 'Ring 1',   icon: CircleDot },
  { key: 'RING_2',    label: 'Ring 2',   icon: CircleDot },
  { key: 'LEGS',      label: 'Legs',     icon: Shirt },
  { key: 'FEET',      label: 'Feet',     icon: Footprints },
  { key: 'TOOL',      label: 'Tool',     icon: Wrench },
];

// ---------------------------------------------------------------------------
// Auto-detect equipment slot from item type + stats
// ---------------------------------------------------------------------------
function detectSlot(item: InventoryItem): string | null {
  const type = item.template.type;
  const stats = item.template.stats as Record<string, unknown> | null;
  const equipSlot = stats?.equipSlot as string | undefined;

  if (type === 'WEAPON') return 'MAIN_HAND';
  if (type === 'TOOL') return 'TOOL';
  if (type === 'ARMOR') {
    // Use equipSlot from stats JSON if set by BLACKSMITH recipes
    if (equipSlot) {
      const slotMap: Record<string, string> = {
        HEAD: 'HEAD', CHEST: 'CHEST', LEGS: 'LEGS',
        FEET: 'FEET', HANDS: 'HANDS', BACK: 'BACK', OFF_HAND: 'OFF_HAND',
      };
      return slotMap[equipSlot] ?? 'CHEST';
    }
    // Guess from name
    const name = item.template.name.toLowerCase();
    if (name.includes('helmet') || name.includes('helm') || name.includes('hat') || name.includes('crown')) return 'HEAD';
    if (name.includes('shield')) return 'OFF_HAND';
    if (name.includes('legging') || name.includes('greave') || name.includes('legs') || name.includes('pants')) return 'LEGS';
    if (name.includes('boots') || name.includes('shoes')) return 'FEET';
    if (name.includes('gloves') || name.includes('gauntlet')) return 'HANDS';
    if (name.includes('cape') || name.includes('cloak')) return 'BACK';
    return 'CHEST'; // default armor → body
  }
  if (type === 'ACCESSORY') {
    if (equipSlot) {
      const slotMap: Record<string, string> = {
        RING_1: 'RING_1', RING_2: 'RING_2', NECK: 'NECK',
      };
      return slotMap[equipSlot] ?? 'RING_1';
    }
    const name = item.template.name.toLowerCase();
    if (name.includes('necklace') || name.includes('amulet') || name.includes('pendant') || name.includes('choker')) return 'NECK';
    return 'RING_1'; // default accessory → ring
  }
  return null;
}

function isEquippable(item: InventoryItem): boolean {
  return detectSlot(item) !== null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [confirmEquip, setConfirmEquip] = useState<{ item: InventoryItem; slot: string; replacing: EquippedItemData | null } | null>(null);
  const [enchantTarget, setEnchantTarget] = useState<InventoryItem | null>(null);
  const [selectedEquipped, setSelectedEquipped] = useState<EquippedItemData | null>(null);
  const [slotChoice, setSlotChoice] = useState<{ item: InventoryItem; slots: { key: string; label: string; occupied: EquippedItemData | null }[] } | null>(null);

  // Fetch character data (inventory + gold)
  const {
    data: character,
    isLoading: charLoading,
    error: charError,
  } = useQuery<CharacterData>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  // Fetch equipped items separately from the real equipment API
  const { data: equippedData } = useQuery<{ equipped: EquippedItemData[] }>({
    queryKey: ['equipment', 'equipped'],
    queryFn: async () => {
      const res = await api.get('/equipment/equipped');
      return res.data;
    },
    enabled: !!character,
  });

  // Fetch equipment stats
  const { data: eqStats } = useQuery<EquipmentStats>({
    queryKey: ['equipment', 'stats'],
    queryFn: async () => {
      const res = await api.get('/equipment/stats');
      return res.data;
    },
    enabled: !!character,
  });

  const equippedItems = equippedData?.equipped ?? [];

  // Equip mutation — uses real equipment API
  const equipMutation = useMutation({
    mutationFn: async ({ itemId, slot }: { itemId: string; slot: string }) => {
      await api.post('/equipment/equip', { itemId, slot });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setSelectedItem(null);
      setSelectedEquipped(null);
      setConfirmEquip(null);
      setSlotChoice(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to equip item', { style: TOAST_STYLE });
    },
  });

  // Unequip mutation — uses real equipment API
  const unequipMutation = useMutation({
    mutationFn: async (slot: string) => {
      await api.post('/equipment/unequip', { slot });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setSelectedItem(null);
      setSelectedEquipped(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to unequip item', { style: TOAST_STYLE });
    },
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function getEquippedInSlot(slot: string): EquippedItemData | null {
    return equippedItems.find((e) => e.slot === slot) ?? null;
  }

  function isItemEquippedSlot(item: InventoryItem): string | null {
    const eq = equippedItems.find((e) => e.item.id === item.id);
    return eq ? eq.slot : null;
  }

  function handleEquipClick(item: InventoryItem) {
    let slot = detectSlot(item);
    if (!slot) return;

    // Fix 3: Weapon off-hand choice
    if (item.template.type === 'WEAPON') {
      const mainHand = getEquippedInSlot('MAIN_HAND');
      const offHand = getEquippedInSlot('OFF_HAND');
      if (mainHand) {
        setSlotChoice({
          item,
          slots: [
            { key: 'MAIN_HAND', label: 'Main Hand', occupied: mainHand },
            { key: 'OFF_HAND', label: 'Off Hand', occupied: offHand },
          ],
        });
        return;
      }
    }

    // Fix 4: Smart ring auto-fill
    if (slot === 'RING_1' && getEquippedInSlot('RING_1') && !getEquippedInSlot('RING_2')) {
      slot = 'RING_2';
    } else if (slot === 'RING_2' && getEquippedInSlot('RING_2') && !getEquippedInSlot('RING_1')) {
      slot = 'RING_1';
    }

    const existing = getEquippedInSlot(slot);
    if (existing) {
      setConfirmEquip({ item, slot, replacing: existing });
    } else {
      equipMutation.mutate({ itemId: item.id, slot });
    }
  }

  function handleSlotChoice(slot: string) {
    if (!slotChoice) return;
    const existing = getEquippedInSlot(slot);
    if (existing) {
      setConfirmEquip({ item: slotChoice.item, slot, replacing: existing });
    } else {
      equipMutation.mutate({ itemId: slotChoice.item.id, slot });
    }
    setSlotChoice(null);
  }

  // -------------------------------------------------------------------------
  // Loading / Error
  // -------------------------------------------------------------------------
  if (charLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            ))}
          </div>
          <div className="h-48 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        </div>
      </div>
    );
  }

  if (charError || !character) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">No Character Found</h2>
        <p className="text-realm-text-secondary mb-6">You need a character to view your inventory.</p>
        <RealmButton variant="primary" size="lg" onClick={() => navigate('/create-character')}>
          Create Character
        </RealmButton>
      </div>
    );
  }

  const inventory: InventoryItem[] = character.inventory ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">Inventory</h1>
              <p className="text-realm-text-muted text-sm mt-1">{character.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg px-4 py-2">
                <Coins className="w-5 h-5 text-realm-gold-400" />
                <span className="font-display text-xl text-realm-gold-400">
                  {(character.gold ?? 0).toLocaleString()}
                </span>
                <span className="text-realm-text-muted text-xs">gold</span>
              </div>
              <RealmButton variant="ghost" size="sm" onClick={() => navigate('/town')}>
                Back to Town
              </RealmButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Equipment Slots (all 12) */}
        <section className="mb-8">
          <h2 className="text-xl font-display text-realm-text-primary mb-4">Equipment</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {PRIMARY_SLOTS.map((slot) => {
              const equipped = getEquippedInSlot(slot.key);
              const Icon = slot.icon;
              const rarityStyle = equipped ? getRarityStyle(equipped.item.quality) : null;
              const isTool = slot.key === 'TOOL' && equipped;
              const durPct = isTool && equipped.item.maxDurability > 0
                ? equipped.item.currentDurability / equipped.item.maxDurability
                : null;

              return (
                <button
                  key={slot.key}
                  onClick={() => {
                    if (equipped) {
                      setSelectedEquipped(equipped);
                      setSelectedItem(null);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[90px]
                    ${equipped
                      ? `${rarityStyle!.border} ${rarityStyle!.bg} hover:brightness-110`
                      : 'border-realm-border border-dashed bg-realm-bg-700/50 hover:border-realm-border/80'}`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${equipped ? rarityStyle!.text : 'text-realm-text-muted/40'}`} />
                  {equipped ? (
                    <>
                      <span className={`text-[10px] text-center leading-tight ${rarityStyle!.text}`}>
                        {equipped.item.name}
                      </span>
                      {/* Stats summary */}
                      {equipped.item.stats && (
                        <span className="text-[9px] text-realm-text-muted mt-0.5">
                          {typeof equipped.item.stats.damage === 'number' && `+${Math.round(equipped.item.stats.damage as number)} ATK`}
                          {typeof equipped.item.stats.armor === 'number' && `+${Math.round(equipped.item.stats.armor as number)} DEF`}
                          {typeof equipped.item.stats.yieldBonus === 'number' && `+${Math.round((equipped.item.stats.yieldBonus as number) * 100)}%`}
                        </span>
                      )}
                      {/* Tool durability bar */}
                      {durPct !== null && (
                        <div className="w-full mt-1 h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              durPct > 0.5 ? 'bg-realm-success' : durPct > 0.25 ? 'bg-realm-gold-400' : 'bg-realm-danger'
                            }`}
                            style={{ width: `${durPct * 100}%` }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-realm-text-muted/40">{slot.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Combat Stats Summary */}
          {eqStats && (eqStats.totalDamage > 0 || eqStats.totalAC > 0) && (
            <div className="flex gap-4 mt-3">
              {eqStats.totalDamage > 0 && (
                <span className="text-xs text-realm-text-secondary">
                  <Swords className="w-3 h-3 inline mr-1 text-realm-danger" />
                  Attack: <span className="text-realm-text-primary font-semibold">{eqStats.totalDamage}</span>
                </span>
              )}
              {eqStats.totalAC > 0 && (
                <span className="text-xs text-realm-text-secondary">
                  <Shield className="w-3 h-3 inline mr-1 text-realm-teal-300" />
                  Defense: <span className="text-realm-text-primary font-semibold">{eqStats.totalAC}</span>
                </span>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inventory Grid */}
          <section className="lg:col-span-2">
            <h2 className="text-xl font-display text-realm-text-primary mb-4">
              Items
              <span className="text-realm-text-muted text-sm ml-2">({inventory.length})</span>
            </h2>

            {inventory.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
                <Package className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">Your inventory is empty.</p>
                <RealmButton variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/crafting')}>
                  Start Crafting
                </RealmButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {inventory.map((item) => {
                  const rarityStyle = getRarityStyle(item.quality || item.template.rarity);
                  const TypeIcon = getTypeIcon(item.template.type);
                  const isSelected = selectedItem?.id === item.id;
                  const equippedSlot = isItemEquippedSlot(item);

                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setSelectedEquipped(null); }}
                      className={`relative p-3 rounded-lg border-2 text-left transition-all
                        ${isSelected
                          ? `${rarityStyle.border} ${rarityStyle.bg} ring-1 ring-realm-gold-500/50`
                          : `${rarityStyle.border} ${rarityStyle.bg} hover:brightness-125`}`}
                    >
                      {equippedSlot && (
                        <span className="absolute top-1 right-1 text-[9px] bg-realm-gold-400/20 text-realm-gold-400 px-1.5 py-0.5 rounded-sm">
                          E
                        </span>
                      )}
                      <div className="flex items-start gap-2">
                        <TypeIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${rarityStyle.text}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${rarityStyle.text}`}>
                            {item.template.name}
                          </p>
                          <p className="text-[10px] text-realm-text-muted capitalize">
                            {item.template.type.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      {item.quantity > 1 && (
                        <span className="absolute bottom-1 right-2 text-xs text-realm-text-secondary font-semibold">
                          x{item.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Detail Panel */}
          <aside className="lg:col-span-1">
            {selectedEquipped ? (
              <EquippedDetailPanel
                equipped={selectedEquipped}
                onClose={() => setSelectedEquipped(null)}
                onUnequip={(slot) => unequipMutation.mutate(slot)}
                isUnequipping={unequipMutation.isPending}
              />
            ) : selectedItem ? (
              <ItemDetailPanel
                item={selectedItem}
                equippedSlot={isItemEquippedSlot(selectedItem)}
                onClose={() => setSelectedItem(null)}
                onEquip={() => handleEquipClick(selectedItem)}
                onUnequip={(slot) => unequipMutation.mutate(slot)}
                onEnchant={() => setEnchantTarget(selectedItem)}
                isEquipping={equipMutation.isPending}
                isUnequipping={unequipMutation.isPending}
              />
            ) : (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 text-center sticky top-8">
                <ChevronRight className="w-8 h-8 text-realm-text-muted/30 mx-auto mb-2" />
                <p className="text-realm-text-muted text-sm">Select an item to view details</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Equip Confirmation Modal */}
      {confirmEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-display text-realm-gold-400 mb-3">Replace Equipment?</h3>
            <p className="text-sm text-realm-text-secondary mb-4">
              Replace <span className="text-realm-text-primary font-semibold">{confirmEquip.replacing?.item.name}</span> with{' '}
              <span className="text-realm-text-primary font-semibold">{confirmEquip.item.template.name}</span>?
              The old item will return to your inventory.
            </p>
            <div className="flex gap-2">
              <RealmButton
                variant="primary"
                className="flex-1"
                onClick={() => equipMutation.mutate({ itemId: confirmEquip.item.id, slot: confirmEquip.slot })}
                disabled={equipMutation.isPending}
              >
                {equipMutation.isPending ? 'Equipping...' : 'Replace'}
              </RealmButton>
              <RealmButton variant="ghost" className="flex-1" onClick={() => setConfirmEquip(null)}>
                Cancel
              </RealmButton>
            </div>
          </div>
        </div>
      )}

      {/* Weapon Slot Choice Modal */}
      {slotChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-display text-realm-gold-400 mb-3">Which Hand?</h3>
            <p className="text-sm text-realm-text-secondary mb-4">
              Equip <span className="text-realm-text-primary font-semibold">{slotChoice.item.template.name}</span> to:
            </p>
            <div className="space-y-2 mb-4">
              {slotChoice.slots.map((s) => (
                <RealmButton
                  key={s.key}
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleSlotChoice(s.key)}
                >
                  {s.label}{s.occupied ? ` — replace ${s.occupied.item.name}` : ''}
                </RealmButton>
              ))}
            </div>
            <RealmButton variant="ghost" className="w-full" onClick={() => setSlotChoice(null)}>
              Cancel
            </RealmButton>
          </div>
        </div>
      )}

      {/* Enchant Modal */}
      {enchantTarget && character && (
        <EnchantModal
          isOpen={!!enchantTarget}
          onClose={() => setEnchantTarget(null)}
          targetItem={enchantTarget}
          inventory={character.inventory}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item Detail Panel
// ---------------------------------------------------------------------------
interface ItemDetailPanelProps {
  item: InventoryItem;
  equippedSlot: string | null;
  onClose: () => void;
  onEquip: () => void;
  onUnequip: (slot: string) => void;
  onEnchant: () => void;
  isEquipping: boolean;
  isUnequipping: boolean;
}

function ItemDetailPanel({
  item,
  equippedSlot,
  onClose,
  onEquip,
  onUnequip,
  onEnchant,
  isEquipping,
  isUnequipping,
}: ItemDetailPanelProps) {
  const rarityStyle = getRarityStyle(item.quality || item.template.rarity);
  const qualityLabel = item.quality || item.template.rarity || 'COMMON';

  const durPct = item.template.durability > 0 ? item.currentDurability / item.template.durability : 1;
  const durColor = durPct > 0.5 ? 'bg-realm-success' : durPct > 0.25 ? 'bg-realm-gold-400' : 'bg-realm-danger';

  // Filter out non-display stats from the stats block
  const displayStats = item.template.stats
    ? Object.entries(item.template.stats).filter(
        ([key]) => !['equipSlot', 'professionType', 'toolType', 'tier'].includes(key),
      )
    : [];

  return (
    <div className={`bg-realm-bg-700 border-2 ${rarityStyle.border} rounded-lg p-5 sticky top-8`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-display text-xl ${rarityStyle.text}`}>{item.template.name}</h3>
          <p className={`text-xs ${rarityStyle.text} opacity-80`}>{qualityLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="text-realm-text-muted hover:text-realm-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Type */}
      <div className="mb-4">
        <span className="text-xs text-realm-text-muted uppercase tracking-wider">Type</span>
        <p className="text-realm-text-primary text-sm capitalize">{item.template.type.toLowerCase()}</p>
      </div>

      {/* Description */}
      {item.template.description && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Description</span>
          <p className="text-realm-text-secondary text-xs leading-relaxed mt-1">{item.template.description}</p>
        </div>
      )}

      {/* Stats */}
      {displayStats.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Stats</span>
          <div className="mt-1 space-y-1">
            {displayStats.map(([stat, value]) => {
              const numVal = typeof value === 'number' ? value : 0;
              const isPercentage = stat === 'yieldBonus' || stat === 'speedBonus';
              const displayVal = isPercentage ? `${numVal > 0 ? '+' : ''}${Math.round(numVal * 100)}%` : `${numVal > 0 ? '+' : ''}${numVal}`;
              return (
                <div key={stat} className="flex justify-between text-xs">
                  <span className="text-realm-text-secondary capitalize">{stat.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={numVal > 0 ? 'text-realm-success' : numVal < 0 ? 'text-realm-danger' : 'text-realm-text-secondary'}>
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Durability */}
      {item.template.durability > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Durability</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-realm-bg-900 rounded-full overflow-hidden">
              <div
                className={`h-full ${durColor} rounded-full transition-all`}
                style={{ width: `${durPct * 100}%` }}
              />
            </div>
            <span className="text-xs text-realm-text-secondary">
              {item.currentDurability}/{item.template.durability}
            </span>
          </div>
        </div>
      )}

      {/* Quantity */}
      {item.quantity > 1 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Quantity</span>
          <p className="text-realm-text-primary text-sm">{item.quantity}</p>
        </div>
      )}

      {/* Crafted By */}
      {item.craftedByName && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Crafted By</span>
          <p className="text-realm-text-primary text-sm">{item.craftedByName}</p>
        </div>
      )}

      {/* Enchantments */}
      {Array.isArray(item.enchantments) && item.enchantments.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Enchantments</span>
          <div className="mt-1 space-y-1">
            {item.enchantments.map((ench, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-realm-purple-400">
                <Sparkles className="w-3 h-3" />
                <span>{ench.scrollName.replace(' Enchantment Scroll', '')}</span>
                <span className="text-realm-text-muted">
                  ({Object.entries(ench.bonuses).map(([k, v]) => `+${v} ${k.replace(/([A-Z])/g, ' $1').trim()}`).join(', ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-2">
        {equippedSlot ? (
          <RealmButton
            variant="danger"
            className="w-full"
            onClick={() => onUnequip(equippedSlot)}
            disabled={isUnequipping}
          >
            {isUnequipping ? 'Unequipping...' : 'Unequip'}
          </RealmButton>
        ) : (
          isEquippable({ ...item }) && (
            <RealmButton
              variant="primary"
              className="w-full"
              onClick={onEquip}
              disabled={isEquipping || item.currentDurability <= 0}
            >
              {isEquipping ? 'Equipping...' : item.currentDurability <= 0 ? 'Broken' : 'Equip'}
            </RealmButton>
          )
        )}
        {(item.template.type === 'WEAPON' || item.template.type === 'ARMOR') && (
          <RealmButton
            variant="ghost"
            className="w-full flex items-center justify-center gap-1.5"
            onClick={onEnchant}
          >
            <Sparkles className="w-4 h-4 text-realm-gold-400" />
            Enchant
          </RealmButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equipped Item Detail Panel
// ---------------------------------------------------------------------------
interface EquippedDetailPanelProps {
  equipped: EquippedItemData;
  onClose: () => void;
  onUnequip: (slot: string) => void;
  isUnequipping: boolean;
}

function EquippedDetailPanel({ equipped, onClose, onUnequip, isUnequipping }: EquippedDetailPanelProps) {
  const rarityStyle = getRarityStyle(equipped.item.quality);
  const qualityLabel = equipped.item.quality || 'COMMON';
  const slotLabel = PRIMARY_SLOTS.find((s) => s.key === equipped.slot)?.label ?? equipped.slot;

  const durPct = equipped.item.maxDurability > 0
    ? equipped.item.currentDurability / equipped.item.maxDurability
    : 1;
  const durColor = durPct > 0.5 ? 'bg-realm-success' : durPct > 0.25 ? 'bg-realm-gold-400' : 'bg-realm-danger';

  // Filter out non-display stats
  const displayStats = equipped.item.stats
    ? Object.entries(equipped.item.stats).filter(
        ([key]) => !['equipSlot', 'professionType', 'toolType', 'tier'].includes(key),
      )
    : [];

  return (
    <div className={`bg-realm-bg-700 border-2 ${rarityStyle.border} rounded-lg p-5 sticky top-8`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-display text-xl ${rarityStyle.text}`}>{equipped.item.name}</h3>
          <p className={`text-xs ${rarityStyle.text} opacity-80`}>{qualityLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="text-realm-text-muted hover:text-realm-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Slot */}
      <div className="mb-4">
        <span className="text-xs text-realm-text-muted uppercase tracking-wider">Equipped Slot</span>
        <p className="text-realm-text-primary text-sm">{slotLabel}</p>
      </div>

      {/* Type */}
      <div className="mb-4">
        <span className="text-xs text-realm-text-muted uppercase tracking-wider">Type</span>
        <p className="text-realm-text-primary text-sm capitalize">{equipped.item.type.toLowerCase()}</p>
      </div>

      {/* Stats */}
      {displayStats.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Stats</span>
          <div className="mt-1 space-y-1">
            {displayStats.map(([stat, value]) => {
              const numVal = typeof value === 'number' ? value : 0;
              const isPercentage = stat === 'yieldBonus' || stat === 'speedBonus';
              const displayVal = isPercentage ? `${numVal > 0 ? '+' : ''}${Math.round(numVal * 100)}%` : `${numVal > 0 ? '+' : ''}${numVal}`;
              return (
                <div key={stat} className="flex justify-between text-xs">
                  <span className="text-realm-text-secondary capitalize">{stat.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={numVal > 0 ? 'text-realm-success' : numVal < 0 ? 'text-realm-danger' : 'text-realm-text-secondary'}>
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Durability */}
      {equipped.item.maxDurability > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Durability</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-realm-bg-900 rounded-full overflow-hidden">
              <div
                className={`h-full ${durColor} rounded-full transition-all`}
                style={{ width: `${durPct * 100}%` }}
              />
            </div>
            <span className="text-xs text-realm-text-secondary">
              {equipped.item.currentDurability}/{equipped.item.maxDurability}
            </span>
          </div>
        </div>
      )}

      {/* Enchantments */}
      {Array.isArray(equipped.item.enchantments) && equipped.item.enchantments.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Enchantments</span>
          <div className="mt-1 space-y-1">
            {equipped.item.enchantments.map((ench, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-realm-purple-400">
                <Sparkles className="w-3 h-3" />
                <span>{ench.scrollName.replace(' Enchantment Scroll', '')}</span>
                <span className="text-realm-text-muted">
                  ({Object.entries(ench.bonuses).map(([k, v]) => `+${v} ${k.replace(/([A-Z])/g, ' $1').trim()}`).join(', ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unequip Action */}
      <div className="mt-6">
        <RealmButton
          variant="danger"
          className="w-full"
          onClick={() => onUnequip(equipped.slot)}
          disabled={isUnequipping}
        >
          {isUnequipping ? 'Unequipping...' : 'Unequip'}
        </RealmButton>
      </div>
    </div>
  );
}
