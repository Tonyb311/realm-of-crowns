import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Beer, Coins, Package, Loader2, AlertCircle, Star, ArrowDownCircle, ArrowUpCircle, Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import GoldAmount from '../shared/GoldAmount';
import { RealmBadge } from '../ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MenuItem {
  itemTemplateId: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  isFood: boolean;
  isBeverage: boolean;
  price: number;
  quantity: number;
  weight: number;
  foodBuff: unknown;
}

interface InnMenuResponse {
  inn: { id: string; name: string; level: number; owner: { id: string; name: string } };
  menu: MenuItem[];
}

interface InventoryItem {
  id: string;
  itemId: string;
  templateId: string;
  templateName: string;
  type: string;
  isFood: boolean;
  isBeverage: boolean;
  quantity: number;
}

interface InnManagementProps {
  buildingId: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InnManagement({ buildingId, onClose }: InnManagementProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'menu' | 'stock'>('menu');

  // Stock form state
  const [stockItemId, setStockItemId] = useState('');
  const [stockQty, setStockQty] = useState(1);
  const [stockPrice, setStockPrice] = useState(1);

  // Price edit state
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState(1);

  // Withdraw state
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawQty, setWithdrawQty] = useState(1);

  // Fetch inn menu (owner sees all items including 0 qty via the same endpoint, we show all)
  const { data: menuData, isLoading: menuLoading } = useQuery<InnMenuResponse>({
    queryKey: ['inn', buildingId, 'menu'],
    queryFn: async () => (await api.get(`/inn/${buildingId}/menu`)).data,
  });

  // Fetch inventory (food/beverage only)
  const { data: invData } = useQuery<{ inventory: InventoryItem[] }>({
    queryKey: ['character', 'me', 'inventory'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const foodBevInventory = (invData?.inventory ?? []).filter(
    (i) => i.isFood || i.isBeverage
  );

  // Stock mutation
  const stockMutation = useMutation({
    mutationFn: async ({ itemId, quantity, price }: { itemId: string; quantity: number; price: number }) => {
      const res = await api.post(`/inn/${buildingId}/menu/stock`, { itemId, quantity, price });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setStockItemId('');
      setStockQty(1);
      queryClient.invalidateQueries({ queryKey: ['inn', buildingId, 'menu'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Failed to stock item'),
  });

  // Set price mutation
  const priceMutation = useMutation({
    mutationFn: async ({ itemTemplateId, price }: { itemTemplateId: string; price: number }) => {
      const res = await api.post(`/inn/${buildingId}/menu/set-price`, { itemTemplateId, price });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setEditPriceId(null);
      queryClient.invalidateQueries({ queryKey: ['inn', buildingId, 'menu'] });
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Failed to update price'),
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ itemTemplateId, quantity }: { itemTemplateId: string; quantity: number }) => {
      const res = await api.post(`/inn/${buildingId}/menu/withdraw`, { itemTemplateId, quantity });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setWithdrawId(null);
      setWithdrawQty(1);
      queryClient.invalidateQueries({ queryKey: ['inn', buildingId, 'menu'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Failed to withdraw item'),
  });

  const inn = menuData?.inn;
  const menu = menuData?.menu ?? [];

  if (menuLoading || !inn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative bg-realm-bg-800 border border-realm-border rounded-lg p-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative bg-realm-bg-800 border border-realm-border rounded-lg max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-realm-border">
          <div>
            <h3 className="font-display text-lg text-realm-gold-400">{inn.name}</h3>
            <p className="text-xs text-realm-text-muted flex items-center gap-1">
              Inn
              <span className="flex items-center gap-0.5 ml-1">
                {Array.from({ length: inn.level }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-realm-gold-400 fill-realm-gold-400" />
                ))}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-realm-border">
          {([
            { key: 'menu' as const, label: 'Menu', icon: Beer },
            { key: 'stock' as const, label: 'Stock Items', icon: Plus },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-display text-xs border-b-2 transition-colors
                ${tab === key
                  ? 'border-realm-gold-400 text-realm-gold-400'
                  : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-realm-danger/20 border border-realm-danger/50 rounded-sm text-realm-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {tab === 'menu' && (
            <MenuTab
              menu={menu}
              editPriceId={editPriceId}
              editPriceValue={editPriceValue}
              setEditPriceId={setEditPriceId}
              setEditPriceValue={setEditPriceValue}
              onSetPrice={(id) => priceMutation.mutate({ itemTemplateId: id, price: editPriceValue })}
              pricePending={priceMutation.isPending}
              withdrawId={withdrawId}
              withdrawQty={withdrawQty}
              setWithdrawId={setWithdrawId}
              setWithdrawQty={setWithdrawQty}
              onWithdraw={(id) => withdrawMutation.mutate({ itemTemplateId: id, quantity: withdrawQty })}
              withdrawPending={withdrawMutation.isPending}
            />
          )}

          {tab === 'stock' && (
            <StockTab
              inventory={foodBevInventory}
              stockItemId={stockItemId}
              stockQty={stockQty}
              stockPrice={stockPrice}
              setStockItemId={setStockItemId}
              setStockQty={setStockQty}
              setStockPrice={setStockPrice}
              onStock={() => stockMutation.mutate({ itemId: stockItemId, quantity: stockQty, price: stockPrice })}
              pending={stockMutation.isPending}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu Tab — view/edit current menu items
// ---------------------------------------------------------------------------
interface MenuTabProps {
  menu: MenuItem[];
  editPriceId: string | null;
  editPriceValue: number;
  setEditPriceId: (id: string | null) => void;
  setEditPriceValue: (v: number) => void;
  onSetPrice: (id: string) => void;
  pricePending: boolean;
  withdrawId: string | null;
  withdrawQty: number;
  setWithdrawId: (id: string | null) => void;
  setWithdrawQty: (v: number) => void;
  onWithdraw: (id: string) => void;
  withdrawPending: boolean;
}

function MenuTab({
  menu, editPriceId, editPriceValue, setEditPriceId, setEditPriceValue,
  onSetPrice, pricePending, withdrawId, withdrawQty, setWithdrawId, setWithdrawQty,
  onWithdraw, withdrawPending,
}: MenuTabProps) {
  if (menu.length === 0) {
    return (
      <div className="text-center py-6">
        <Package className="w-6 h-6 text-realm-text-muted/30 mx-auto mb-2" />
        <p className="text-realm-text-muted text-xs">Your menu is empty. Stock items from the Stock tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {menu.map((item) => (
        <div key={item.itemTemplateId} className="bg-realm-bg-900 border border-realm-border rounded-sm p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Beer className="w-3.5 h-3.5 text-realm-gold-400" />
              <span className="text-sm text-realm-text-primary">{item.name}</span>
              <span className="text-[10px] text-realm-text-muted">x{item.quantity}</span>
              <RealmBadge variant={item.isBeverage ? 'uncommon' : 'default'}>
                {item.isBeverage ? 'Drink' : 'Food'}
              </RealmBadge>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Coins className="w-3 h-3 text-realm-gold-400" />
              <GoldAmount amount={item.price} />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {/* Edit price */}
            {editPriceId === item.itemTemplateId ? (
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  min={1}
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 bg-realm-bg-800 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500 focus:outline-hidden"
                />
                <button
                  onClick={() => onSetPrice(item.itemTemplateId)}
                  disabled={pricePending}
                  className="px-2 py-1 bg-realm-gold-500 text-realm-bg-900 font-display text-[10px] rounded-sm hover:bg-realm-gold-400 disabled:opacity-50"
                >
                  {pricePending ? '...' : 'Set'}
                </button>
                <button
                  onClick={() => setEditPriceId(null)}
                  className="px-2 py-1 text-realm-text-muted text-[10px] hover:text-realm-text-primary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditPriceId(item.itemTemplateId); setEditPriceValue(item.price); }}
                className="px-2 py-1 border border-realm-border text-[10px] text-realm-text-muted rounded-sm hover:border-realm-gold-500/30 hover:text-realm-text-secondary"
              >
                Edit Price
              </button>
            )}

            {/* Withdraw */}
            {withdrawId === item.itemTemplateId ? (
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={withdrawQty}
                  onChange={(e) => setWithdrawQty(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                  className="w-14 px-2 py-1 bg-realm-bg-800 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500 focus:outline-hidden"
                />
                <button
                  onClick={() => onWithdraw(item.itemTemplateId)}
                  disabled={withdrawPending}
                  className="px-2 py-1 bg-realm-success text-realm-text-primary font-display text-[10px] rounded-sm hover:bg-realm-success/80 disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-3 h-3 inline mr-0.5" />
                  {withdrawPending ? '...' : 'Take'}
                </button>
                <button
                  onClick={() => setWithdrawId(null)}
                  className="px-2 py-1 text-realm-text-muted text-[10px] hover:text-realm-text-primary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setWithdrawId(item.itemTemplateId); setWithdrawQty(1); }}
                className="px-2 py-1 border border-realm-border text-[10px] text-realm-text-muted rounded-sm hover:border-realm-gold-500/30 hover:text-realm-text-secondary"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stock Tab — add items from inventory to menu
// ---------------------------------------------------------------------------
interface StockTabProps {
  inventory: InventoryItem[];
  stockItemId: string;
  stockQty: number;
  stockPrice: number;
  setStockItemId: (v: string) => void;
  setStockQty: (v: number) => void;
  setStockPrice: (v: number) => void;
  onStock: () => void;
  pending: boolean;
}

function StockTab({
  inventory, stockItemId, stockQty, stockPrice,
  setStockItemId, setStockQty, setStockPrice, onStock, pending,
}: StockTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpCircle className="w-4 h-4 text-realm-success" />
        <span className="text-xs font-display text-realm-text-primary">Stock from Inventory</span>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-6">
          <Package className="w-6 h-6 text-realm-text-muted/30 mx-auto mb-2" />
          <p className="text-realm-text-muted text-xs">No food or beverages in your inventory.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Item selector */}
          <div>
            <label className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1 block">Item</label>
            <select
              value={stockItemId}
              onChange={(e) => { setStockItemId(e.target.value); setStockQty(1); }}
              className="w-full bg-realm-bg-900 border border-realm-border rounded-sm px-3 py-2 text-xs text-realm-text-primary focus:border-realm-gold-500 focus:outline-hidden"
            >
              <option value="">Select food or beverage...</option>
              {inventory.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.templateName} (x{item.quantity}) {item.isBeverage ? '[Drink]' : '[Food]'}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1 block">Quantity</label>
              <input
                type="number"
                min={1}
                value={stockQty}
                onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1 block">Price (each)</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={stockPrice}
                  onChange={(e) => setStockPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500 focus:outline-hidden pr-6"
                />
                <Coins className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-realm-gold-400" />
              </div>
            </div>
          </div>

          {/* Stock button */}
          <button
            onClick={onStock}
            disabled={!stockItemId || pending}
            className="w-full py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-xs rounded-sm hover:bg-realm-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {pending ? 'Stocking...' : 'Add to Menu'}
          </button>
        </div>
      )}
    </div>
  );
}
