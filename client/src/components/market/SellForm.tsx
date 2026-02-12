import { CircleDollarSign, X } from 'lucide-react';
import GoldAmount from '../shared/GoldAmount';

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  quantity: number;
  description?: string;
}

interface SellFormProps {
  inventory: InventoryItem[] | undefined;
  listItemId: string;
  onListItemIdChange: (v: string) => void;
  listPrice: string;
  onListPriceChange: (v: string) => void;
  listQty: string;
  onListQtyChange: (v: string) => void;
  listTotal: number;
  listTax: number;
  selectedInventoryItem: InventoryItem | undefined;
  listPriceNum: number;
  listQtyNum: number;
  isPending: boolean;
  isError: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export default function SellForm({
  inventory,
  listItemId, onListItemIdChange,
  listPrice, onListPriceChange,
  listQty, onListQtyChange,
  listTotal, listTax,
  selectedInventoryItem,
  listPriceNum, listQtyNum,
  isPending, isError,
  onSubmit, onClose,
}: SellFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
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
              onChange={(e) => onListItemIdChange(e.target.value)}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
            >
              <option value="">Choose from inventory...</option>
              {inventory?.map((item) => (
                <option key={item.itemId} value={item.itemId}>
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
                onChange={(e) => onListPriceChange(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-400/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-realm-text-muted text-xs mb-1 block">
              Quantity {selectedInventoryItem ? `(max: ${selectedInventoryItem.quantity})` : ''}
            </label>
            <input
              type="number"
              value={listQty}
              onChange={(e) => onListQtyChange(e.target.value)}
              min="1"
              max={selectedInventoryItem?.quantity ?? undefined}
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
            />
          </div>

          {/* Preview */}
          {listPriceNum > 0 && listQtyNum > 0 && (
            <div className="bg-realm-bg-900 border border-realm-border rounded p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-realm-text-muted">Total Sale Price</span>
                <GoldAmount amount={listTotal} className="text-realm-text-primary" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-realm-text-muted">Estimated Tax (10%)</span>
                <GoldAmount amount={listTax} className="text-realm-text-muted" />
              </div>
              <div className="flex justify-between text-xs border-t border-realm-border pt-1.5 font-semibold">
                <span className="text-realm-text-secondary">You Receive</span>
                <GoldAmount amount={listTotal - listTax} className="text-realm-gold-400" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending || !listItemId || listPriceNum <= 0 || listQtyNum <= 0}
            className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
        {isError && (
          <p className="text-realm-danger text-xs mt-3 text-center">Failed to list item. Please try again.</p>
        )}
      </div>
    </div>
  );
}
