import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Apple,
  Loader2,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FoodItem {
  inventoryId: string;
  itemId: string;
  templateId: string;
  name: string;
  description: string;
  quantity: number;
  daysRemaining: number | null;
  isPerishable: boolean;
  isBeverage: boolean;
  foodBuff: string | null;
}

type SortMode = 'expiry' | 'buff' | 'name';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FoodInventoryPanel() {
  const [sortBy, setSortBy] = useState<SortMode>('expiry');

  const { data, isLoading } = useQuery<{ food: FoodItem[] }>({
    queryKey: ['food', 'inventory'],
    queryFn: async () => {
      const res = await api.get('/food/inventory');
      return res.data;
    },
  });

  const food = data?.food ?? [];

  // Sort
  const sorted = [...food].sort((a, b) => {
    switch (sortBy) {
      case 'expiry':
        return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
      case 'buff':
        return (a.foodBuff ? 0 : 1) - (b.foodBuff ? 0 : 1);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Summary
  const totalCount = food.reduce((sum, f) => sum + f.quantity, 0);
  const daysOfFood = totalCount; // 1 food = 1 day

  if (isLoading) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-primary-400 text-sm flex items-center gap-2">
          <Apple className="w-4 h-4" />
          Food Supply
        </h3>
        <span className="text-[10px] text-parchment-500 bg-dark-400 px-2 py-0.5 rounded">
          {totalCount} items / ~{daysOfFood} days
        </span>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <ArrowUpDown className="w-3 h-3 text-parchment-500" />
        {(['expiry', 'buff', 'name'] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortBy(mode)}
            className={`text-[10px] px-2 py-0.5 rounded font-display transition-colors capitalize
              ${sortBy === mode
                ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                : 'text-parchment-500 hover:text-parchment-300 border border-transparent'}`}
          >
            {mode}
          </button>
        ))}
      </div>

      {food.length === 0 ? (
        <div className="text-center py-6">
          <Apple className="w-8 h-8 text-parchment-500/30 mx-auto mb-2" />
          <p className="text-parchment-500 text-xs">No food in inventory.</p>
          <p className="text-parchment-500/60 text-[10px] mt-1">Visit the market or gather food.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {sorted.map((item) => (
            <FoodItemRow key={item.inventoryId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Food item row
// ---------------------------------------------------------------------------

function FoodItemRow({ item }: { item: FoodItem }) {
  const daysColor = getDaysColor(item.daysRemaining);

  return (
    <div className="flex items-center gap-3 p-2 bg-dark-400/50 rounded-lg hover:bg-dark-400 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-parchment-200 text-xs font-display truncate">{item.name}</span>
          {item.isBeverage && (
            <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 rounded">drink</span>
          )}
        </div>
        {item.foodBuff && (
          <p className="text-green-400 text-[10px] truncate">{item.foodBuff}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-parchment-300 text-xs">x{item.quantity}</span>
        {item.isPerishable && item.daysRemaining != null && (
          <span className={`text-[10px] font-display flex items-center gap-0.5 ${daysColor}`}>
            {item.daysRemaining <= 1 && <AlertTriangle className="w-3 h-3" />}
            {item.daysRemaining}d
          </span>
        )}
      </div>
    </div>
  );
}

function getDaysColor(days: number | null): string {
  if (days == null) return 'text-parchment-500';
  if (days > 3) return 'text-green-400';
  if (days >= 2) return 'text-yellow-400';
  return 'text-red-400';
}
