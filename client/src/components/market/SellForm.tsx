import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, X } from 'lucide-react';
import { RealmButton } from '../ui/RealmButton';
import GoldAmount from '../shared/GoldAmount';
import NetProceedsPreview from './NetProceedsPreview';
import api from '../../services/api';

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  quantity: number;
  description?: string;
}

interface FeePreview {
  askingPrice: number;
  feeRate: number;
  feeAmount: number;
  netProceeds: number;
  isMerchant: boolean;
}

interface SellFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SellForm({ onClose, onSuccess }: SellFormProps) {
  const queryClient = useQueryClient();
  const [listItemId, setListItemId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listQty, setListQty] = useState('1');

  // Fetch inventory
  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/items/inventory');
      const d = res.data;
      return Array.isArray(d) ? d : (d?.items ?? d?.inventory ?? []);
    },
  });

  // Fetch fee preview to get the rate
  const { data: feePreview } = useQuery<FeePreview>({
    queryKey: ['market', 'list-preview'],
    queryFn: async () =>
      (await api.get('/market/list-preview', { params: { askingPrice: 100 } })).data,
  });

  const feeRate = feePreview?.feeRate ?? 0.1;
  const isMerchant = feePreview?.isMerchant ?? false;

  const listPriceNum = parseFloat(listPrice) || 0;
  const listQtyNum = parseInt(listQty, 10) || 0;
  const selectedItem = inventory?.find((i) => i.itemId === listItemId || i.id === listItemId);
  const totalAskingPrice = listPriceNum * listQtyNum;

  const listMutation = useMutation({
    mutationFn: async (data: { itemId: string; price: number; quantity: number }) => {
      return (await api.post('/market/list', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onSuccess();
    },
  });

  const handleSubmit = () => {
    if (!listItemId || listPriceNum <= 0 || listQtyNum <= 0) return;
    listMutation.mutate({ itemId: listItemId, price: listPriceNum, quantity: listQtyNum });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display text-realm-gold-400">List Item for Sale</h3>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Item selector */}
          <div>
            <label className="text-realm-text-muted text-xs mb-1 block">Select Item</label>
            <select
              value={listItemId}
              onChange={(e) => setListItemId(e.target.value)}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
            >
              <option value="">Choose from inventory...</option>
              {inventory?.map((item) => (
                <option key={item.itemId || item.id} value={item.itemId || item.id}>
                  {item.name} ({item.rarity}) x{item.quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Price per unit */}
          <div>
            <label className="text-realm-text-muted text-xs mb-1 block">Price per Unit</label>
            <div className="relative">
              <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-gold-400" />
              <input
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-400/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-realm-text-muted text-xs mb-1 block">
              Quantity {selectedItem ? `(max: ${selectedItem.quantity})` : ''}
            </label>
            <input
              type="number"
              value={listQty}
              onChange={(e) => setListQty(e.target.value)}
              min="1"
              max={selectedItem?.quantity ?? undefined}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
            />
          </div>

          {/* Net proceeds preview */}
          {listPriceNum > 0 && listQtyNum > 0 && (
            <div className="space-y-2">
              {listQtyNum > 1 && (
                <div className="flex justify-between text-xs px-1">
                  <span className="text-realm-text-muted">Total Sale Price</span>
                  <GoldAmount amount={totalAskingPrice} className="text-realm-text-primary" />
                </div>
              )}
              <NetProceedsPreview
                askingPrice={totalAskingPrice}
                feeRate={feeRate}
                isMerchant={isMerchant}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <RealmButton variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </RealmButton>
          <RealmButton
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={listMutation.isPending || !listItemId || listPriceNum <= 0 || listQtyNum <= 0}
            className="flex-1"
          >
            {listMutation.isPending ? 'Listing...' : 'List for Sale'}
          </RealmButton>
        </div>
        {listMutation.isError && (
          <p className="text-realm-danger text-xs mt-3 text-center">
            Failed to list item. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
