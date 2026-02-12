import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Wrench,
  Coins,
  Loader2,
  AlertCircle,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { buildingTypeLabel } from './BuildingCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RentalInfo {
  buildingId: string;
  buildingName: string;
  type: string;
  level: number;
  owner: { id: string; name: string };
  pricePerUse: number;
  isAvailable: boolean;
}

interface WorkshopViewProps {
  buildingId: string;
  isOwner: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Workshop bonus calculation
// ---------------------------------------------------------------------------
function getWorkshopBonus(type: string, level: number) {
  const speedPct = level * 10;
  const qualityBonus = level;
  return { speedPct, qualityBonus };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WorkshopView({ buildingId, isOwner, onClose }: WorkshopViewProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [rentalPrice, setRentalPrice] = useState<number>(0);
  const [priceEditing, setPriceEditing] = useState(false);
  const [useSuccess, setUseSuccess] = useState(false);

  // Fetch rental info
  const { data: rentalData, isLoading } = useQuery<{ rental: RentalInfo }>({
    queryKey: ['building', buildingId, 'rent'],
    queryFn: async () => {
      const res = await api.get(`/buildings/${buildingId}/rent`);
      return res.data;
    },
  });

  const rental = rentalData?.rental;

  // Set rental price mutation (owner only)
  const setPriceMutation = useMutation({
    mutationFn: async (price: number) => {
      const res = await api.post(`/buildings/${buildingId}/rent/set-price`, { pricePerUse: price });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setPriceEditing(false);
      queryClient.invalidateQueries({ queryKey: ['building', buildingId, 'rent'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to set rental price');
    },
  });

  // Use workshop mutation (renter)
  const useWorkshopMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/buildings/${buildingId}/rent/use`);
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setUseSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to use workshop');
    },
  });

  if (isLoading || !rental) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative bg-realm-bg-800 border border-realm-border rounded-lg p-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const { speedPct, qualityBonus } = getWorkshopBonus(rental.type, rental.level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative bg-realm-bg-800 border border-realm-border rounded-lg max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-realm-border">
          <div>
            <h3 className="font-display text-lg text-realm-gold-400">{rental.buildingName}</h3>
            <p className="text-xs text-realm-text-muted">
              {buildingTypeLabel(rental.type)} Workshop
            </p>
          </div>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Workshop bonuses */}
          <div className="bg-realm-bg-900 border border-realm-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5 text-realm-gold-400" />
              <span className="font-display text-sm text-realm-text-primary">Crafting Bonuses</span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < rental.level ? 'text-realm-gold-400 fill-realm-gold-400' : 'text-realm-border'}`}
                />
              ))}
              <span className="text-xs text-realm-text-muted ml-2">Level {rental.level}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-secondary">Speed Bonus</span>
                <span className="text-realm-success font-display">+{speedPct}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-secondary">Quality Bonus</span>
                <span className="text-realm-success font-display">+{qualityBonus}</span>
              </div>
            </div>
          </div>

          {/* Owner view: rental settings */}
          {isOwner && (
            <div className="bg-realm-bg-900 border border-realm-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-realm-gold-400" />
                <span className="font-display text-sm text-realm-text-primary">Rental Settings</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-realm-text-secondary">Price per use</span>
                {priceEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={rentalPrice}
                      onChange={(e) => setRentalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2 py-1 bg-realm-bg-800 border border-realm-border rounded text-sm text-realm-text-primary focus:border-realm-gold-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setPriceMutation.mutate(rentalPrice)}
                      disabled={setPriceMutation.isPending}
                      className="px-2 py-1 bg-realm-gold-500 text-realm-bg-900 text-xs font-display rounded hover:bg-realm-gold-400"
                    >
                      {setPriceMutation.isPending ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setPriceEditing(false)}
                      className="text-xs text-realm-text-muted hover:text-realm-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setRentalPrice(rental.pricePerUse);
                      setPriceEditing(true);
                    }}
                    className="text-sm text-realm-gold-400 hover:text-realm-gold-400/80 font-display"
                  >
                    {rental.pricePerUse > 0 ? `${rental.pricePerUse} gold` : 'Free'} (edit)
                  </button>
                )}
              </div>
              <p className="text-[10px] text-realm-text-muted">
                Other players pay this amount each time they use your workshop.
              </p>
            </div>
          )}

          {/* Renter view: use workshop */}
          {!isOwner && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-realm-text-secondary">Owner</span>
                <span className="text-sm text-realm-text-primary">{rental.owner.name}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-realm-text-secondary">Cost to use</span>
                <span className="text-sm text-realm-gold-400 font-display">
                  {rental.pricePerUse > 0 ? `${rental.pricePerUse} gold` : 'Free'}
                </span>
              </div>

              {useSuccess ? (
                <motion.div
                  className="p-4 border border-realm-success/30 bg-realm-success/10 rounded-lg text-center"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <CheckCircle2 className="w-8 h-8 text-realm-success mx-auto mb-2" />
                  <p className="text-sm text-realm-text-primary font-display">Workshop Access Granted!</p>
                  <p className="text-xs text-realm-text-muted mt-1">
                    Go to the Crafting page to use this workshop's bonuses.
                  </p>
                </motion.div>
              ) : (
                <button
                  onClick={() => useWorkshopMutation.mutate()}
                  disabled={useWorkshopMutation.isPending || !rental.isAvailable}
                  className="w-full py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {useWorkshopMutation.isPending ? 'Processing...' : 'Use Workshop'}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
