import {
  Crown, Gem, Shield, Shirt, Swords, Hand, CircleDot, Footprints, Wrench, PackageOpen,
} from 'lucide-react';
import { RealmPanel, RealmTooltip } from '../ui/realm-index';
import { getRarityStyle } from '../../constants';

const SLOT_META: { key: string; label: string; icon: any; gridArea: string }[] = [
  { key: 'HEAD',      label: 'Head',     icon: Crown,     gridArea: 'head' },
  { key: 'NECK',      label: 'Neck',     icon: Gem,       gridArea: 'neck' },
  { key: 'BACK',      label: 'Back',     icon: Shield,    gridArea: 'back' },
  { key: 'CHEST',     label: 'Body',     icon: Shirt,     gridArea: 'chest' },
  { key: 'MAIN_HAND', label: 'Weapon',   icon: Swords,    gridArea: 'main' },
  { key: 'OFF_HAND',  label: 'Off Hand', icon: Shield,    gridArea: 'off' },
  { key: 'RING_1',    label: 'Ring 1',   icon: CircleDot, gridArea: 'r1' },
  { key: 'HANDS',     label: 'Hands',    icon: Hand,      gridArea: 'hands' },
  { key: 'RING_2',    label: 'Ring 2',   icon: CircleDot, gridArea: 'r2' },
  { key: 'LEGS',      label: 'Legs',     icon: Shirt,     gridArea: 'legs' },
  { key: 'FEET',      label: 'Feet',     icon: Footprints,gridArea: 'feet' },
  { key: 'TOOL',      label: 'Tool',     icon: Wrench,    gridArea: 'tool' },
  { key: 'BAG',       label: 'Bag',      icon: PackageOpen, gridArea: 'bag' },
];

interface EquipmentItem {
  slot: string;
  itemId: string;
  itemName: string;
  quality: string;
  stats?: any;
  enchanted?: boolean;
  nonProficient?: boolean;
}

interface Props {
  equipment: EquipmentItem[];
  isOwnProfile: boolean;
}

export function EquipmentPaperDoll({ equipment, isOwnProfile }: Props) {
  const equipped = new Map(equipment.map(e => [e.slot, e]));

  return (
    <RealmPanel title="Equipment">
      {/* Paper doll grid (desktop) */}
      <div className="hidden sm:grid gap-2" style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateAreas: `
          ". head ."
          "neck . back"
          ". chest ."
          "main . off"
          "r1 hands r2"
          ". legs ."
          ". feet ."
          "tool . bag"
        `,
      }}>
        {SLOT_META.map((slot) => {
          const item = equipped.get(slot.key);
          const Icon = slot.icon;
          const rarity = item ? getRarityStyle(item.quality) : null;

          const isNonProf = item?.nonProficient;
          const slotContent = (
            <div
              key={slot.key}
              style={{ gridArea: slot.gridArea }}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg border text-center min-h-[60px]
                ${item
                  ? isNonProf
                    ? 'border-realm-damage/60 bg-realm-damage/10'
                    : `border-realm-border/60 bg-realm-bg-800 ${rarity?.border ?? ''}`
                  : 'border-realm-border/20 bg-realm-bg-800/30'
                }
              `}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${item ? (isNonProf ? 'text-realm-damage-light' : (rarity?.text ?? 'text-realm-text-primary')) : 'text-realm-text-muted/30'}`} />
              {item ? (
                <span className={`text-[10px] leading-tight font-semibold ${isNonProf ? 'text-realm-damage-muted' : (rarity?.text ?? 'text-realm-text-primary')}`}>
                  {item.itemName}
                  {item.enchanted && <span className="text-realm-purple-300 ml-0.5">*</span>}
                </span>
              ) : (
                <span className="text-[10px] text-realm-text-muted/30 italic">{slot.label}</span>
              )}
              {isNonProf && (
                <span className="text-[8px] text-realm-damage-light mt-0.5">Not proficient</span>
              )}
            </div>
          );

          if (item && isOwnProfile) {
            const lines: string[] = [];
            if (item.stats) {
              const fs = item.stats.finalStats ?? {};
              if (fs.damage) lines.push(`+${Math.round(fs.damage)} Damage`);
              if (fs.armor) lines.push(`+${Math.round(fs.armor)} AC`);
              ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(s => {
                if (fs[s]) lines.push(`+${Math.round(fs[s])} ${s.slice(0, 3).toUpperCase()}`);
              });
            }
            if (isNonProf) lines.push('Not proficient \u2014 combat penalties apply');
            if (lines.length > 0) {
              return (
                <RealmTooltip key={slot.key} content={<div className="text-xs">{lines.join(' | ')}</div>}>
                  {slotContent}
                </RealmTooltip>
              );
            }
          }

          return slotContent;
        })}
      </div>

      {/* Linear list (mobile) */}
      <div className="sm:hidden space-y-1.5">
        {SLOT_META.map((slot) => {
          const item = equipped.get(slot.key);
          const Icon = slot.icon;
          const rarity = item ? getRarityStyle(item.quality) : null;

          return (
            <div key={slot.key} className="flex items-center gap-3 py-1">
              <Icon className={`w-4 h-4 flex-shrink-0 ${item ? (rarity?.text ?? 'text-realm-text-primary') : 'text-realm-text-muted/40'}`} />
              <span className="text-xs text-realm-text-muted w-16 flex-shrink-0">{slot.label}</span>
              {item ? (
                <span className={`text-xs font-semibold ${rarity?.text ?? 'text-realm-text-primary'}`}>
                  {item.itemName}
                  {item.enchanted && <span className="text-realm-purple-300 ml-0.5">*</span>}
                </span>
              ) : (
                <span className="text-xs text-realm-text-muted/40 italic">Empty</span>
              )}
            </div>
          );
        })}
      </div>
    </RealmPanel>
  );
}
