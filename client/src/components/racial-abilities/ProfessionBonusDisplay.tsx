import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Loader2,
  Cog,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfessionBonusItem {
  professionType: string;
  label: string;
  bonusPercent: number;
  bonusType: 'speed' | 'quality' | 'yield' | 'xp' | 'material_reduction';
  source: string;
}

interface ProfessionBonusesResponse {
  bonuses: ProfessionBonusItem[];
  gnomeEurekaAvailable?: boolean;
  forgebornOverclockActive?: boolean;
  forgebornOverclockRemaining?: number;
}

interface ProfessionBonusDisplayProps {
  race: string;
  currentProfession?: string;
  mode: 'crafting' | 'gathering';
}

// ---------------------------------------------------------------------------
// Bonus type display
// ---------------------------------------------------------------------------
const BONUS_TYPE_LABELS: Record<string, string> = {
  speed: 'Speed',
  quality: 'Quality',
  yield: 'Yield',
  xp: 'XP',
  material_reduction: 'Materials',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProfessionBonusDisplay({
  race,
  currentProfession,
  mode,
}: ProfessionBonusDisplayProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ProfessionBonusesResponse>({
    queryKey: ['profession-bonuses', race],
    queryFn: async () => {
      const res = await api.get(`/races/profession-bonuses/${race}`);
      return res.data;
    },
    enabled: !!race,
  });

  const eurekaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/races/gnome-eureka');
      return res.data;
    },
    onSuccess: (result) => {
      toast.success(result.message ?? 'Eureka! Instant completion!');
      queryClient.invalidateQueries({ queryKey: ['crafting'] });
      queryClient.invalidateQueries({ queryKey: ['work'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Eureka failed');
    },
  });

  const overclockMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/races/forgeborn-overclock');
      return res.data;
    },
    onSuccess: (result) => {
      toast.success(result.message ?? 'Overclock engaged!');
      queryClient.invalidateQueries({ queryKey: ['profession-bonuses', race] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Overclock failed');
    },
  });

  if (isLoading || !data) return null;

  // Filter bonuses relevant to current context
  const relevantBonuses = data.bonuses.filter((b) => {
    if (currentProfession && b.professionType !== 'ALL' && b.professionType !== currentProfession) {
      return false;
    }
    if (mode === 'crafting' && b.bonusType === 'yield') return false;
    if (mode === 'gathering' && (b.bonusType === 'quality' || b.bonusType === 'material_reduction')) return false;
    return true;
  });

  if (
    relevantBonuses.length === 0 &&
    !data.gnomeEurekaAvailable &&
    !data.forgebornOverclockActive
  ) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {/* Bonus line items */}
      {relevantBonuses.map((bonus, i) => {
        const isNegative = bonus.bonusPercent < 0;
        return (
          <motion.div
            key={`${bonus.label}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center justify-between text-xs px-3 py-1.5 rounded ${
              isNegative
                ? 'bg-red-900/10 border border-red-500/20'
                : 'bg-green-900/10 border border-green-500/20'
            }`}
          >
            <span className="flex items-center gap-1.5 text-parchment-300">
              {isNegative ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <TrendingUp className="w-3 h-3 text-green-400" />
              )}
              <span>{BONUS_TYPE_LABELS[bonus.bonusType] ?? bonus.bonusType}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`font-display ${
                  isNegative ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {isNegative ? '' : '+'}
                {bonus.bonusPercent}%
              </span>
              <span className="text-[10px] text-parchment-500">({bonus.source})</span>
            </span>
          </motion.div>
        );
      })}

      {/* Forgeborn Overclock indicator */}
      {data.forgebornOverclockActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded bg-amber-900/20 border border-amber-500/30"
        >
          <Cog className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-xs text-amber-300 font-display">2x Speed Active</span>
          {data.forgebornOverclockRemaining != null && (
            <span className="text-[10px] text-amber-400/60 ml-auto tabular-nums">
              {data.forgebornOverclockRemaining}s
            </span>
          )}
        </motion.div>
      )}

      {/* Gnome Eureka button */}
      {data.gnomeEurekaAvailable && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => eurekaMutation.mutate()}
          disabled={eurekaMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded
            bg-purple-900/30 border border-purple-500/40 text-purple-300 font-display text-xs
            hover:bg-purple-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {eurekaMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Instant Complete!
        </motion.button>
      )}
    </div>
  );
}
