import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Swords,
  Coins,
  Footprints,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AmbushEventProps {
  caravanId: string;
  onClose: () => void;
}

interface AmbushResult {
  outcome: string;
  cargoLost: Array<{ itemId: string; itemName: string; quantity: number; unitValue: number }>;
  goldLost: number;
  cargoRemaining: Array<{ itemId: string; itemName: string; quantity: number; unitValue: number }>;
  insurancePayout?: number;
}

const FIGHT_BASE_SUCCESS = 0.40;
const RANSOM_COST_FRACTION = 0.30;
const FLEE_CARGO_LOSS_FRACTION = 0.20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AmbushEvent({ caravanId, onClose }: AmbushEventProps) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<AmbushResult | null>(null);

  const resolveMutation = useMutation({
    mutationFn: async (choice: 'fight' | 'ransom' | 'flee') => {
      const res = await api.post(`/caravans/${caravanId}/resolve-ambush`, { choice });
      return res.data as AmbushResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
    },
  });

  const isPending = resolveMutation.isPending;
  const error = resolveMutation.error as any;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-400 border border-red-500/30 rounded-xl w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="font-display text-lg text-red-400">Ambush!</h2>
          </div>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {!result ? (
            <>
              <p className="text-parchment-300 text-sm mb-6">
                Your caravan has been ambushed by bandits on the road! Choose how to respond:
              </p>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error?.response?.data?.error ?? 'Something went wrong'}
                </div>
              )}

              <div className="space-y-3">
                {/* Fight */}
                <button
                  onClick={() => resolveMutation.mutate('fight')}
                  disabled={isPending}
                  className="w-full text-left bg-dark-300 border border-dark-50 rounded-lg p-3 hover:border-red-500/30 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Swords className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-display text-parchment-200 text-sm">Fight</h4>
                      <p className="text-parchment-500 text-[11px]">
                        Base {Math.round(FIGHT_BASE_SUCCESS * 100)}% success chance. Win: keep all cargo. Lose: lose 40% of cargo.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Ransom */}
                <button
                  onClick={() => resolveMutation.mutate('ransom')}
                  disabled={isPending}
                  className="w-full text-left bg-dark-300 border border-dark-50 rounded-lg p-3 hover:border-yellow-500/30 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                      <Coins className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-display text-parchment-200 text-sm">Pay Ransom</h4>
                      <p className="text-parchment-500 text-[11px]">
                        Pay {Math.round(RANSOM_COST_FRACTION * 100)}% of cargo value in gold. Keep all cargo intact.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Flee */}
                <button
                  onClick={() => resolveMutation.mutate('flee')}
                  disabled={isPending}
                  className="w-full text-left bg-dark-300 border border-dark-50 rounded-lg p-3 hover:border-blue-500/30 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Footprints className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-display text-parchment-200 text-sm">Flee</h4>
                      <p className="text-parchment-500 text-[11px]">
                        Guaranteed escape. Lose {Math.round(FLEE_CARGO_LOSS_FRACTION * 100)}% of cargo in the chaos.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {isPending && (
                <div className="flex items-center justify-center gap-2 mt-4 text-parchment-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving...
                </div>
              )}
            </>
          ) : (
            /* Result screen */
            <div className="text-center">
              {result.outcome === 'victory' ? (
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              ) : (
                <XCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              )}

              <h3 className="font-display text-lg text-parchment-200 mb-2">
                {result.outcome === 'victory' && 'Victory!'}
                {result.outcome === 'defeat' && 'Defeated...'}
                {result.outcome === 'ransomed' && 'Ransom Paid'}
                {result.outcome === 'fled' && 'Escaped!'}
              </h3>

              <p className="text-parchment-400 text-sm mb-4">
                {result.outcome === 'victory' && 'You fought off the bandits! All cargo is safe.'}
                {result.outcome === 'defeat' && 'The bandits overpowered you. Some cargo was lost.'}
                {result.outcome === 'ransomed' && `You paid ${result.goldLost}g to the bandits. Cargo is safe.`}
                {result.outcome === 'fled' && 'You escaped, but dropped some cargo behind.'}
              </p>

              {result.cargoLost.length > 0 && (
                <div className="bg-dark-500 border border-dark-50 rounded-lg p-3 mb-3 text-left">
                  <h4 className="font-display text-xs text-red-400 uppercase tracking-wider mb-2">Cargo Lost</h4>
                  {result.cargoLost.map(item => (
                    <div key={item.itemId} className="flex items-center justify-between text-xs text-parchment-400 py-0.5">
                      <span>{item.itemName}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.insurancePayout && result.insurancePayout > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                  <p className="text-green-400 text-sm">
                    Insurance payout: <strong>{result.insurancePayout}g</strong>
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
