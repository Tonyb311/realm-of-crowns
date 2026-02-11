import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Loader2,
  Save,
  Apple,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TOAST_STYLE } from '../../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FoodPriority = 'EXPIRING_FIRST' | 'BEST_FIRST' | 'SPECIFIC_ITEM' | 'CATEGORY_ONLY';

interface FoodSettings {
  foodPriority: FoodPriority;
  preferredFoodId: string | null;
}

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: { value: FoodPriority; label: string; description: string }[] = [
  {
    value: 'EXPIRING_FIRST',
    label: 'Eat Expiring First',
    description: 'Minimize waste by eating food closest to spoiling',
  },
  {
    value: 'BEST_FIRST',
    label: 'Best Food First',
    description: 'Always eat the food with the best buff',
  },
  {
    value: 'SPECIFIC_ITEM',
    label: 'Specific Item',
    description: 'Always eat a particular food item if available',
  },
  {
    value: 'CATEGORY_ONLY',
    label: 'Category Only',
    description: 'Only eat food from a specific category',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FoodPreferencePanel() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<FoodSettings>({
    queryKey: ['food', 'settings'],
    queryFn: async () => {
      const res = await api.get('/food/settings');
      return res.data;
    },
  });

  const [priority, setPriority] = useState<FoodPriority>('EXPIRING_FIRST');
  const [preferredFoodId, setPreferredFoodId] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setPriority(data.foodPriority);
      setPreferredFoodId(data.preferredFoodId);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/food/settings', {
        foodPriority: priority,
        preferredFoodId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food', 'settings'] });
      toast.success('Food preferences saved', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to save', { style: TOAST_STYLE });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
      <h3 className="font-display text-primary-400 text-sm flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4" />
        Food Preferences
      </h3>

      <div className="space-y-2 mb-4">
        {PRIORITY_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
              ${priority === opt.value
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-dark-50 hover:border-parchment-500/20'}`}
          >
            <input
              type="radio"
              name="foodPriority"
              checked={priority === opt.value}
              onChange={() => setPriority(opt.value)}
              className="mt-0.5 w-3.5 h-3.5 border-dark-50 bg-dark-500 text-green-500 focus:ring-green-500 focus:ring-offset-0"
            />
            <div>
              <p className="text-parchment-200 text-xs font-display">{opt.label}</p>
              <p className="text-parchment-500 text-[10px]">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Preview */}
      <div className="p-3 bg-dark-400 rounded-lg mb-4">
        <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1">Tomorrow's Strategy</p>
        <p className="text-parchment-200 text-xs flex items-center gap-1.5">
          <Apple className="w-3 h-3 text-green-400" />
          {getPreviewText(priority)}
        </p>
      </div>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saveMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save Preferences
      </button>
    </div>
  );
}

function getPreviewText(priority: FoodPriority): string {
  switch (priority) {
    case 'EXPIRING_FIRST':
      return 'Will eat food closest to expiring';
    case 'BEST_FIRST':
      return 'Will eat food with the best buff';
    case 'SPECIFIC_ITEM':
      return 'Will eat preferred item if available';
    case 'CATEGORY_ONLY':
      return 'Will only eat from selected category';
    default:
      return 'Default eating strategy';
  }
}
