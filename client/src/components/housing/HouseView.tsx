import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Package,
  ArrowDown,
  ArrowUp,
  BarChart3,
  X,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StorageItem {
  itemTemplateId: string;
  itemName: string;
  itemType: string;
  itemRarity: string;
  quantity: number;
}

interface HouseStorageResponse {
  house: {
    id: string;
    name: string;
    townId: string;
    townName: string;
    tier: number;
    storageSlots: number;
  };
  storage: {
    capacity: number;
    used: number;
    items: StorageItem[];
  };
}

interface InventoryItem {
  id: string;
  quantity: number;
  item: {
    id: string;
    template: { id: string; name: string; type: string; rarity: string };
  };
}

interface HouseViewProps {
  houseId: string;
  isCurrentTown: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HouseView({ houseId, isCurrentTown, onClose }: HouseViewProps) {
  const queryClient = useQueryClient();
  const [depositMode, setDepositMode] = useState(false);
  const [withdrawItem, setWithdrawItem] = useState<StorageItem | null>(null);
  const [withdrawQty, setWithdrawQty] = useState(1);
  const [listItem, setListItem] = useState<StorageItem | null>(null);
  const [listQty, setListQty] = useState(1);
  const [listPrice, setListPrice] = useState(1);

  // Fetch storage contents
  const { data, isLoading } = useQuery<HouseStorageResponse>({
    queryKey: ['houses', houseId, 'storage'],
    queryFn: async () => (await api.get(`/houses/${houseId}/storage`)).data,
  });

  // Fetch inventory (for deposit)
  const { data: inventoryData } = useQuery<{ inventory: InventoryItem[] }>({
    queryKey: ['inventory'],
    queryFn: async () => (await api.get('/characters/me')).data,
    enabled: depositMode,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['houses', houseId, 'storage'] });
    queryClient.invalidateQueries({ queryKey: ['houses'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
  };

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async ({ itemTemplateId, quantity }: { itemTemplateId: string; quantity: number }) => {
      return (await api.post(`/houses/${houseId}/storage/deposit`, { itemTemplateId, quantity })).data;
    },
    onSuccess: () => {
      invalidateAll();
      setDepositMode(false);
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ itemTemplateId, quantity }: { itemTemplateId: string; quantity: number }) => {
      return (await api.post(`/houses/${houseId}/storage/withdraw`, { itemTemplateId, quantity })).data;
    },
    onSuccess: () => {
      invalidateAll();
      setWithdrawItem(null);
      setWithdrawQty(1);
    },
  });

  // List on market mutation
  const listMutation = useMutation({
    mutationFn: async ({ itemTemplateId, quantity, price }: { itemTemplateId: string; quantity: number; price: number }) => {
      return (await api.post(`/houses/${houseId}/storage/list`, { itemTemplateId, quantity, price })).data;
    },
    onSuccess: () => {
      invalidateAll();
      setListItem(null);
      setListQty(1);
      setListPrice(1);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const { house, storage } = data;

  // Group inventory by template for deposit
  const inventoryByTemplate: Record<string, { templateId: string; templateName: string; totalQty: number }> = {};
  if (inventoryData?.inventory) {
    for (const entry of inventoryData.inventory) {
      const tid = entry.item.template.id;
      if (!inventoryByTemplate[tid]) {
        inventoryByTemplate[tid] = { templateId: tid, templateName: entry.item.template.name, totalQty: 0 };
      }
      inventoryByTemplate[tid].totalQty += entry.quantity;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-realm-bg-800 border border-realm-border rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-realm-border">
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-realm-gold-400" />
            <div>
              <h2 className="font-display text-realm-gold-400 text-lg">{house.name}</h2>
              <p className="text-xs text-realm-text-muted">{house.townName} &middot; Tier {house.tier} Cottage</p>
            </div>
          </div>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage summary */}
        <div className="px-6 py-3 border-b border-realm-border bg-realm-bg-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-realm-text-secondary flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Storage Room
            </span>
            <span className="text-xs text-realm-text-muted">
              {storage.used}/{storage.capacity} slots used
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-realm-bg-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-realm-gold-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (storage.used / storage.capacity) * 100)}%` }}
            />
          </div>
        </div>

        {/* Storage items */}
        <div className="px-6 py-4">
          {storage.items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-realm-text-muted/30 mx-auto mb-2" />
              <p className="text-sm text-realm-text-muted">Storage is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {storage.items.map(item => (
                <div key={item.itemTemplateId} className="flex items-center justify-between bg-realm-bg-700 border border-realm-border rounded px-4 py-2.5">
                  <div>
                    <span className="text-sm text-realm-text-primary">{item.itemName}</span>
                    <span className="text-xs text-realm-text-muted ml-2">x{item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrentTown && (
                      <button
                        onClick={() => { setWithdrawItem(item); setWithdrawQty(Math.min(1, item.quantity)); }}
                        className="px-3 py-1 text-[11px] font-display border border-realm-text-muted/30 text-realm-text-secondary rounded hover:bg-realm-bg-600 transition-colors flex items-center gap-1"
                      >
                        <ArrowUp className="w-3 h-3" />
                        Withdraw
                      </button>
                    )}
                    <button
                      onClick={() => { setListItem(item); setListQty(Math.min(1, item.quantity)); setListPrice(1); }}
                      className="px-3 py-1 text-[11px] font-display border border-realm-gold-500/30 text-realm-gold-400 rounded hover:bg-realm-gold-500/10 transition-colors flex items-center gap-1"
                    >
                      <BarChart3 className="w-3 h-3" />
                      List
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="px-6 py-4 border-t border-realm-border flex gap-3">
          {isCurrentTown && (
            <button
              onClick={() => setDepositMode(true)}
              className="px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors flex items-center gap-2"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Deposit Items
            </button>
          )}
          {!isCurrentTown && (
            <p className="text-xs text-realm-text-muted italic">
              Travel to {house.townName} to deposit or withdraw items.
            </p>
          )}
        </div>

        {/* Deposit modal */}
        {depositMode && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setDepositMode(false)}>
            <div className="bg-realm-bg-800 border border-realm-border rounded-lg w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-realm-border">
                <h3 className="font-display text-realm-gold-400 text-sm">Deposit from Inventory</h3>
                <button onClick={() => setDepositMode(false)} className="text-realm-text-muted hover:text-realm-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {Object.values(inventoryByTemplate).length === 0 ? (
                  <p className="text-sm text-realm-text-muted text-center py-4">No items in inventory</p>
                ) : (
                  Object.values(inventoryByTemplate).map(inv => (
                    <button
                      key={inv.templateId}
                      onClick={() => depositMutation.mutate({ itemTemplateId: inv.templateId, quantity: inv.totalQty })}
                      disabled={depositMutation.isPending}
                      className="w-full flex items-center justify-between bg-realm-bg-700 border border-realm-border rounded px-4 py-2.5 hover:border-realm-gold-500/40 transition-colors disabled:opacity-40"
                    >
                      <span className="text-sm text-realm-text-primary">{inv.templateName}</span>
                      <span className="text-xs text-realm-text-muted">x{inv.totalQty}</span>
                    </button>
                  ))
                )}
                {depositMutation.isError && (
                  <p className="text-[11px] text-realm-danger mt-2">
                    {(depositMutation.error as any)?.response?.data?.error || 'Deposit failed.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Withdraw modal */}
        {withdrawItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setWithdrawItem(null)}>
            <div className="bg-realm-bg-800 border border-realm-border rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-realm-border">
                <h3 className="font-display text-realm-gold-400 text-sm">Withdraw {withdrawItem.itemName}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs text-realm-text-muted">Quantity (max {withdrawItem.quantity})</label>
                  <input
                    type="number"
                    min={1}
                    max={withdrawItem.quantity}
                    value={withdrawQty}
                    onChange={e => setWithdrawQty(Math.max(1, Math.min(withdrawItem.quantity, parseInt(e.target.value) || 1)))}
                    className="mt-1 w-full bg-realm-bg-700 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => withdrawMutation.mutate({ itemTemplateId: withdrawItem.itemTemplateId, quantity: withdrawQty })}
                    disabled={withdrawMutation.isPending}
                    className="flex-1 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 disabled:opacity-40"
                  >
                    {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                  <button onClick={() => setWithdrawItem(null)} className="px-4 py-2 border border-realm-text-muted/30 text-realm-text-secondary text-sm rounded hover:bg-realm-bg-700">
                    Cancel
                  </button>
                </div>
                {withdrawMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(withdrawMutation.error as any)?.response?.data?.error || 'Withdraw failed.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* List on market modal */}
        {listItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setListItem(null)}>
            <div className="bg-realm-bg-800 border border-realm-border rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-realm-border">
                <h3 className="font-display text-realm-gold-400 text-sm">List {listItem.itemName} on Market</h3>
                <p className="text-[10px] text-realm-text-muted mt-0.5">Listed in {house.townName}'s market</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs text-realm-text-muted">Quantity (max {listItem.quantity})</label>
                  <input
                    type="number"
                    min={1}
                    max={listItem.quantity}
                    value={listQty}
                    onChange={e => setListQty(Math.max(1, Math.min(listItem.quantity, parseInt(e.target.value) || 1)))}
                    className="mt-1 w-full bg-realm-bg-700 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-realm-text-muted">Price per unit (gold)</label>
                  <input
                    type="number"
                    min={1}
                    value={listPrice}
                    onChange={e => setListPrice(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 w-full bg-realm-bg-700 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                  />
                </div>
                <p className="text-[10px] text-realm-text-muted">
                  Total: {listQty * listPrice}g &middot; Free action (no daily action consumed)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => listMutation.mutate({ itemTemplateId: listItem.itemTemplateId, quantity: listQty, price: listPrice })}
                    disabled={listMutation.isPending}
                    className="flex-1 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 disabled:opacity-40"
                  >
                    {listMutation.isPending ? 'Listing...' : 'List on Market'}
                  </button>
                  <button onClick={() => setListItem(null)} className="px-4 py-2 border border-realm-text-muted/30 text-realm-text-secondary text-sm rounded hover:bg-realm-bg-700">
                    Cancel
                  </button>
                </div>
                {listMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(listMutation.error as any)?.response?.data?.error || 'Listing failed.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
