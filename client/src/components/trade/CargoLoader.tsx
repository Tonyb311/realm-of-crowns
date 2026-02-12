import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  type: string;
  rarity: string;
  basePrice: number;
}

interface CargoItem {
  itemId: string;
  quantity: number;
  itemName: string;
  unitValue: number;
}

interface CargoLoaderProps {
  caravanId: string;
  capacity: number;
  currentCargo: CargoItem[];
  currentTotalItems: number;
  onCargoUpdated: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CargoLoader({
  caravanId,
  capacity,
  currentCargo,
  currentTotalItems,
  onCargoUpdated,
}: CargoLoaderProps) {
  const queryClient = useQueryClient();
  const [loadQuantities, setLoadQuantities] = useState<Record<string, number>>({});
  const [unloadQuantities, setUnloadQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  // Fetch player inventory
  const { data: inventoryData, isLoading: invLoading } = useQuery<{ items: InventoryItem[] }>({
    queryKey: ['inventory', 'mine'],
    queryFn: async () => {
      const res = await api.get('/inventory/mine');
      return res.data;
    },
  });

  const inventory = inventoryData?.items ?? [];
  const slotsRemaining = capacity - currentTotalItems;
  const usedPercent = capacity > 0 ? Math.round((currentTotalItems / capacity) * 100) : 0;

  // Load mutation
  const loadMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await api.post(`/caravans/${caravanId}/load`, { itemId, quantity });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      onCargoUpdated();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to load item');
    },
  });

  // Unload mutation
  const unloadMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await api.post(`/caravans/${caravanId}/unload`, { itemId, quantity });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      onCargoUpdated();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to unload item');
    },
  });

  function handleLoad(itemId: string) {
    const qty = loadQuantities[itemId] ?? 1;
    if (qty <= 0) return;
    loadMutation.mutate({ itemId, quantity: qty });
    setLoadQuantities(prev => ({ ...prev, [itemId]: 1 }));
  }

  function handleUnload(itemId: string) {
    const qty = unloadQuantities[itemId] ?? 1;
    if (qty <= 0) return;
    unloadMutation.mutate({ itemId, quantity: qty });
    setUnloadQuantities(prev => ({ ...prev, [itemId]: 1 }));
  }

  const isLoading = loadMutation.isPending || unloadMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Capacity bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-realm-text-muted mb-1">
          <span>Cargo Capacity</span>
          <span>{currentTotalItems} / {capacity} ({slotsRemaining} remaining)</span>
        </div>
        <div className="w-full h-2 bg-realm-bg-900 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${usedPercent >= 90 ? 'bg-realm-danger' : usedPercent >= 70 ? 'bg-realm-gold-500' : 'bg-realm-gold-500'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-realm-danger text-xs bg-realm-danger/10 border border-realm-danger/20 rounded px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inventory (left) */}
        <div>
          <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-2">
            Your Inventory
          </h4>
          {invLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin" />
            </div>
          ) : inventory.length === 0 ? (
            <p className="text-realm-text-muted text-xs py-4 text-center">No items in inventory</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {inventory.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-realm-bg-800 border border-realm-border rounded p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-realm-text-primary text-xs truncate">{item.name}</p>
                    <p className="text-realm-text-muted/60 text-[10px]">
                      x{item.quantity} &middot; {item.basePrice}g each
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={Math.min(item.quantity, slotsRemaining)}
                    value={loadQuantities[item.itemId] ?? 1}
                    onChange={(e) => setLoadQuantities(prev => ({
                      ...prev,
                      [item.itemId]: Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)),
                    }))}
                    className="w-12 text-center bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-xs py-1"
                  />
                  <button
                    onClick={() => handleLoad(item.itemId)}
                    disabled={isLoading || slotsRemaining <= 0}
                    className="p-1.5 bg-realm-gold-500/20 text-realm-gold-400 rounded hover:bg-realm-gold-500/30 transition-colors disabled:opacity-30"
                    title="Load into caravan"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cargo (right) */}
        <div>
          <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-2">
            Caravan Cargo
          </h4>
          {currentCargo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-realm-text-muted">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No cargo loaded yet</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {currentCargo.map(item => (
                <div key={item.itemId} className="flex items-center gap-2 bg-realm-bg-800 border border-realm-border rounded p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-realm-text-primary text-xs truncate">{item.itemName}</p>
                    <p className="text-realm-text-muted/60 text-[10px]">
                      x{item.quantity} &middot; {item.unitValue}g each
                      <span className="ml-1 text-realm-text-muted">({item.unitValue * item.quantity}g total)</span>
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={unloadQuantities[item.itemId] ?? 1}
                    onChange={(e) => setUnloadQuantities(prev => ({
                      ...prev,
                      [item.itemId]: Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)),
                    }))}
                    className="w-12 text-center bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-xs py-1"
                  />
                  <button
                    onClick={() => handleUnload(item.itemId)}
                    disabled={isLoading}
                    className="p-1.5 bg-realm-danger/20 text-realm-danger rounded hover:bg-realm-danger/30 transition-colors disabled:opacity-30"
                    title="Unload from caravan"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Total cargo value */}
          {currentCargo.length > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-realm-text-muted pt-2 border-t border-realm-border">
              <span>Total Value</span>
              <span className="text-realm-gold-400 font-display">
                {currentCargo.reduce((sum, c) => sum + c.unitValue * c.quantity, 0)}g
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
