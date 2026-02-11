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
      <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display text-primary-400">List Item for Sale</h3>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Item selector */}
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Select Item</label>
            <select
              value={listItemId}
              onChange={(e) => onListItemIdChange(e.target.value)}
              className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
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
            <label className="text-parchment-500 text-xs mb-1 block">Price per Unit</label>
            <div className="relative">
              <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="number"
                value={listPrice}
                onChange={(e) => onListPriceChange(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full pl-9 pr-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">
              Quantity {selectedInventoryItem ? `(max: ${selectedInventoryItem.quantity})` : ''}
            </label>
            <input
              type="number"
              value={listQty}
              onChange={(e) => onListQtyChange(e.target.value)}
              min="1"
              max={selectedInventoryItem?.quantity ?? undefined}
              className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
            />
          </div>

          {/* Preview */}
          {listPriceNum > 0 && listQtyNum > 0 && (
            <div className="bg-dark-500 border border-dark-50 rounded p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-parchment-500">Total Sale Price</span>
                <GoldAmount amount={listTotal} className="text-parchment-200" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-parchment-500">Estimated Tax (10%)</span>
                <GoldAmount amount={listTax} className="text-parchment-500" />
              </div>
              <div className="flex justify-between text-xs border-t border-dark-50 pt-1.5 font-semibold">
                <span className="text-parchment-300">You Receive</span>
                <GoldAmount amount={listTotal - listTax} className="text-primary-400" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending || !listItemId || listPriceNum <= 0 || listQtyNum <= 0}
            className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
        {isError && (
          <p className="text-blood-light text-xs mt-3 text-center">Failed to list item. Please try again.</p>
        )}
      </div>
    </div>
  );
}
