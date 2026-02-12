import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Shield,
  Swords,
  Crown,
  Shirt,
  Hand,
  Footprints,
  Gem,
  Coins,
  X,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { getRarityStyle } from '../constants';
import { RealmButton } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ItemTemplate {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  stats: Record<string, number> | null;
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
  enchantments: string[];
}

interface EquipmentSlots {
  head: InventoryItem | null;
  chest: InventoryItem | null;
  hands: InventoryItem | null;
  legs: InventoryItem | null;
  feet: InventoryItem | null;
  mainHand: InventoryItem | null;
  offHand: InventoryItem | null;
  accessory1: InventoryItem | null;
  accessory2: InventoryItem | null;
}

interface CharacterData {
  id: string;
  name: string;
  gold: number;
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
}

// ---------------------------------------------------------------------------
// Item type icons
// ---------------------------------------------------------------------------
const TYPE_ICONS: Record<string, typeof Package> = {
  WEAPON: Swords,
  ARMOR: Shield,
  CONSUMABLE: Gem,
  MATERIAL: Package,
};

function getTypeIcon(type: string) {
  return TYPE_ICONS[type] ?? Package;
}

// ---------------------------------------------------------------------------
// Equipment slot definitions
// ---------------------------------------------------------------------------
interface SlotDef {
  key: keyof EquipmentSlots;
  label: string;
  icon: typeof Shield;
}

const EQUIPMENT_SLOTS: SlotDef[] = [
  { key: 'head',      label: 'Head',      icon: Crown },
  { key: 'chest',     label: 'Chest',     icon: Shirt },
  { key: 'hands',     label: 'Hands',     icon: Hand },
  { key: 'legs',      label: 'Legs',      icon: Shirt },
  { key: 'feet',      label: 'Feet',      icon: Footprints },
  { key: 'mainHand',  label: 'Main Hand', icon: Swords },
  { key: 'offHand',   label: 'Off Hand',  icon: Shield },
  { key: 'accessory1', label: 'Accessory', icon: Gem },
  { key: 'accessory2', label: 'Accessory', icon: Gem },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Fetch character data
  const {
    data: character,
    isLoading,
    error,
  } = useQuery<CharacterData>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  // Equip / Unequip mutations (placeholder APIs)
  const equipMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post(`/characters/me/equip`, { itemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setSelectedItem(null);
    },
  });

  const unequipMutation = useMutation({
    mutationFn: async (slot: string) => {
      await api.post(`/characters/me/unequip`, { slot });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setSelectedItem(null);
    },
  });

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------
  if (isLoading) {
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

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">No Character Found</h2>
        <p className="text-realm-text-secondary mb-6">You need a character to view your inventory.</p>
        <RealmButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/create-character')}
        >
          Create Character
        </RealmButton>
      </div>
    );
  }

  const inventory: InventoryItem[] = character.inventory ?? [];
  const equipment: EquipmentSlots = character.equipment ?? {
    head: null,
    chest: null,
    hands: null,
    legs: null,
    feet: null,
    mainHand: null,
    offHand: null,
    accessory1: null,
    accessory2: null,
  };

  // Check if an item is currently equipped
  const isItemEquipped = (item: InventoryItem): string | null => {
    for (const slot of EQUIPMENT_SLOTS) {
      const equipped = equipment[slot.key];
      if (equipped && equipped.id === item.id) return slot.key;
    }
    return null;
  };

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
              {/* Gold balance */}
              <div className="flex items-center gap-2 bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg px-4 py-2">
                <Coins className="w-5 h-5 text-realm-gold-400" />
                <span className="font-display text-xl text-realm-gold-400">
                  {(character.gold ?? 0).toLocaleString()}
                </span>
                <span className="text-realm-text-muted text-xs">gold</span>
              </div>
              <RealmButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/town')}
              >
                Back to Town
              </RealmButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Equipment Slots */}
        <section className="mb-8">
          <h2 className="text-xl font-display text-realm-text-primary mb-4">Equipment</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {EQUIPMENT_SLOTS.map((slot, idx) => {
              const equipped = equipment[slot.key];
              const Icon = slot.icon;
              const rarityStyle = equipped ? getRarityStyle(equipped.quality || equipped.template.rarity) : null;

              return (
                <button
                  key={`${slot.key}-${idx}`}
                  onClick={() => equipped && setSelectedItem(equipped)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[80px]
                    ${equipped
                      ? `${rarityStyle!.border} ${rarityStyle!.bg} hover:brightness-110`
                      : 'border-realm-border border-dashed bg-realm-bg-700/50 hover:border-realm-border/80'}`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${equipped ? rarityStyle!.text : 'text-realm-text-muted/40'}`} />
                  {equipped ? (
                    <span className={`text-[10px] text-center leading-tight ${rarityStyle!.text}`}>
                      {equipped.template.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-realm-text-muted/40">{slot.label}</span>
                  )}
                </button>
              );
            })}
          </div>
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
                <RealmButton
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/crafting')}
                >
                  Start Crafting
                </RealmButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {inventory.map((item) => {
                  const rarityStyle = getRarityStyle(item.quality || item.template.rarity);
                  const TypeIcon = getTypeIcon(item.template.type);
                  const isSelected = selectedItem?.id === item.id;
                  const equippedSlot = isItemEquipped(item);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`relative p-3 rounded-lg border-2 text-left transition-all
                        ${isSelected
                          ? `${rarityStyle.border} ${rarityStyle.bg} ring-1 ring-realm-gold-500/50`
                          : `${rarityStyle.border} border-opacity-40 ${rarityStyle.bg} hover:border-opacity-80`}`}
                    >
                      {equippedSlot && (
                        <span className="absolute top-1 right-1 text-[9px] bg-realm-gold-400/20 text-realm-gold-400 px-1.5 py-0.5 rounded">
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
            {selectedItem ? (
              <ItemDetailPanel
                item={selectedItem}
                equippedSlot={isItemEquipped(selectedItem)}
                onClose={() => setSelectedItem(null)}
                onEquip={() => equipMutation.mutate(selectedItem.id)}
                onUnequip={(slot) => unequipMutation.mutate(slot)}
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
  isEquipping: boolean;
  isUnequipping: boolean;
}

function ItemDetailPanel({
  item,
  equippedSlot,
  onClose,
  onEquip,
  onUnequip,
  isEquipping,
  isUnequipping,
}: ItemDetailPanelProps) {
  const rarityStyle = getRarityStyle(item.quality || item.template.rarity);
  const qualityLabel = item.quality || item.template.rarity || 'COMMON';

  const durPct = item.template.durability > 0 ? item.currentDurability / item.template.durability : 1;
  const durColor = durPct > 0.5 ? 'bg-realm-success' : durPct > 0.25 ? 'bg-realm-gold-400' : 'bg-realm-danger';

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
      {item.template.stats && Object.keys(item.template.stats).length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-realm-text-muted uppercase tracking-wider">Stats</span>
          <div className="mt-1 space-y-1">
            {Object.entries(item.template.stats).map(([stat, value]) => (
              <div key={stat} className="flex justify-between text-xs">
                <span className="text-realm-text-secondary capitalize">{stat.replace(/_/g, ' ')}</span>
                <span className={value > 0 ? 'text-realm-success' : 'text-realm-danger'}>
                  {value > 0 ? '+' : ''}{value}
                </span>
              </div>
            ))}
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
                style={{
                  width: `${durPct * 100}%`,
                }}
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
          (item.template.type === 'WEAPON' || item.template.type === 'ARMOR') && (
            <RealmButton
              variant="primary"
              className="w-full"
              onClick={onEquip}
              disabled={isEquipping}
            >
              {isEquipping ? 'Equipping...' : 'Equip'}
            </RealmButton>
          )
        )}
      </div>
    </div>
  );
}
