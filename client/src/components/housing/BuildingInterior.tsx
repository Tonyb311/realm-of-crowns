import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Star,
  Box,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { buildingTypeLabel } from './BuildingCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StorageItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface BuildingDetail {
  id: string;
  type: string;
  name: string;
  level: number;
  owner: { id: string; name: string };
  town: { id: string; name: string };
  hasStorage: boolean;
  storage: { capacity: number; used: number } | null;
  constructions: { id: string; status: string; completesAt: string | null }[];
}

interface InventoryItem {
  itemId: string;
  templateName: string;
  quantity: number;
}

interface BuildingInteriorProps {
  buildingId: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BuildingInterior({ buildingId, onClose, onUpgrade }: BuildingInteriorProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [depositItemId, setDepositItemId] = useState('');
  const [depositQty, setDepositQty] = useState(1);
  const [withdrawItemId, setWithdrawItemId] = useState('');
  const [withdrawQty, setWithdrawQty] = useState(1);

  // Fetch building detail
  const { data: buildingData, isLoading } = useQuery<{ building: BuildingDetail }>({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const res = await api.get(`/buildings/${buildingId}`);
      return res.data;
    },
  });

  // Fetch storage items
  const { data: storageData } = useQuery<{ storage: { capacity: number; used: number; items: StorageItem[] } }>({
    queryKey: ['building', buildingId, 'storage'],
    queryFn: async () => {
      const res = await api.get(`/buildings/${buildingId}/storage`);
      return res.data;
    },
    enabled: !!buildingData?.building?.hasStorage,
  });

  // Fetch player inventory
  const { data: charData } = useQuery<{ inventory: InventoryItem[] }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const building = buildingData?.building;
  const storage = storageData?.storage;
  const inventory = charData?.inventory ?? [];

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await api.post(`/buildings/${buildingId}/storage/deposit`, { itemId, quantity });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setDepositItemId('');
      setDepositQty(1);
      queryClient.invalidateQueries({ queryKey: ['building', buildingId, 'storage'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to deposit item');
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await api.post(`/buildings/${buildingId}/storage/withdraw`, { itemId, quantity });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setWithdrawItemId('');
      setWithdrawQty(1);
      queryClient.invalidateQueries({ queryKey: ['building', buildingId, 'storage'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to withdraw item');
    },
  });

  if (isLoading || !building) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative bg-dark-400 border border-dark-50 rounded-lg p-8">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const hasActiveConstruction = building.constructions.some(c => c.status === 'PENDING' || c.status === 'IN_PROGRESS');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative bg-dark-400 border border-dark-50 rounded-lg max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50">
          <div>
            <h3 className="font-display text-lg text-primary-400">{building.name}</h3>
            <p className="text-xs text-parchment-500">
              {buildingTypeLabel(building.type)} - Level {building.level}
            </p>
          </div>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Building info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < building.level ? 'text-primary-400 fill-primary-400' : 'text-dark-50'}`}
                />
              ))}
            </div>
            <span className="text-xs text-parchment-500">
              {building.town.name}
            </span>
          </div>

          {/* Upgrade button */}
          {building.level >= 1 && building.level < 5 && !hasActiveConstruction && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full py-2 border border-primary-400/40 text-primary-400 font-display text-sm rounded hover:bg-primary-400/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade to Level {building.level + 1}
            </button>
          )}

          {/* Storage section */}
          {building.hasStorage && storage && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display text-sm text-parchment-200 flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary-400" />
                  Storage
                </h4>
                <span className="text-xs text-parchment-500">
                  {storage.used}/{storage.capacity} slots
                </span>
              </div>

              {/* Stored items grid */}
              {storage.items.length === 0 ? (
                <div className="bg-dark-500 border border-dark-50 rounded p-4 text-center">
                  <Package className="w-6 h-6 text-parchment-500/30 mx-auto mb-2" />
                  <p className="text-parchment-500 text-xs">Storage is empty.</p>
                </div>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {storage.items.map((item) => (
                    <div
                      key={item.itemId}
                      className={`flex items-center gap-2 bg-dark-500 rounded px-3 py-2 cursor-pointer transition-colors ${
                        withdrawItemId === item.itemId ? 'border border-primary-400/40' : 'border border-transparent hover:border-dark-50/80'
                      }`}
                      onClick={() => {
                        setWithdrawItemId(item.itemId);
                        setWithdrawQty(1);
                      }}
                    >
                      <Package className="w-3.5 h-3.5 text-parchment-500 flex-shrink-0" />
                      <span className="text-sm text-parchment-200 flex-1">{item.itemName}</span>
                      <span className="text-xs text-parchment-500 font-display">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Withdraw panel */}
              {withdrawItemId && (
                <div className="bg-dark-500 border border-dark-50 rounded p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-4 h-4 text-primary-400" />
                    <span className="text-xs font-display text-parchment-200">Withdraw to Inventory</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={withdrawQty}
                      onChange={(e) => setWithdrawQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2 py-1.5 bg-dark-400 border border-dark-50 rounded text-sm text-parchment-200 focus:border-primary-400 focus:outline-none"
                    />
                    <button
                      onClick={() => withdrawMutation.mutate({ itemId: withdrawItemId, quantity: withdrawQty })}
                      disabled={withdrawMutation.isPending}
                      className="flex-1 py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors disabled:opacity-50"
                    >
                      {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                    <button
                      onClick={() => setWithdrawItemId('')}
                      className="px-2 py-1.5 text-parchment-500 hover:text-parchment-200 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Deposit from inventory */}
              <div className="bg-dark-500 border border-dark-50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-display text-parchment-200">Deposit from Inventory</span>
                </div>
                {inventory.length === 0 ? (
                  <p className="text-parchment-500 text-xs">Your inventory is empty.</p>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={depositItemId}
                      onChange={(e) => { setDepositItemId(e.target.value); setDepositQty(1); }}
                      className="flex-1 bg-dark-400 border border-dark-50 rounded px-2 py-1.5 text-xs text-parchment-200 focus:border-primary-400 focus:outline-none"
                    >
                      <option value="">Select item...</option>
                      {inventory.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {item.templateName} (x{item.quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={depositQty}
                      onChange={(e) => setDepositQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1.5 bg-dark-400 border border-dark-50 rounded text-sm text-parchment-200 focus:border-primary-400 focus:outline-none"
                    />
                    <button
                      onClick={() => depositMutation.mutate({ itemId: depositItemId, quantity: depositQty })}
                      disabled={!depositItemId || depositMutation.isPending}
                      className="px-3 py-1.5 bg-green-600 text-white font-display text-xs rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                    >
                      {depositMutation.isPending ? '...' : 'Store'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Room display (decorative) */}
          {building.hasStorage && (
            <div>
              <h4 className="font-display text-sm text-parchment-200 mb-2">Rooms</h4>
              <div className="grid grid-cols-3 gap-2">
                {['Main Hall', 'Bedroom', 'Study'].map((room) => (
                  <div
                    key={room}
                    className="bg-dark-500 border border-dark-50 rounded p-3 text-center"
                  >
                    <div className="w-8 h-8 bg-dark-400 rounded border border-dashed border-parchment-500/20 mx-auto mb-1" />
                    <p className="text-[10px] text-parchment-500">{room}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-parchment-500/60 mt-1 text-center">
                Furniture placement coming soon
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
