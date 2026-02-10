import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Store,
  Coins,
  Package,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ShopViewProps {
  buildingId: string;
  buildingName: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component (placeholder for marketplace stall management)
// ---------------------------------------------------------------------------
export default function ShopView({ buildingId, buildingName, onClose }: ShopViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative bg-dark-400 border border-dark-50 rounded-lg max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50">
          <div>
            <h3 className="font-display text-lg text-primary-400">{buildingName}</h3>
            <p className="text-xs text-parchment-500">Market Stall Management</p>
          </div>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Listed items (placeholder) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-5 h-5 text-primary-400" />
              <span className="font-display text-sm text-parchment-200">Items for Sale</span>
            </div>
            <div className="bg-dark-500 border border-dark-50 rounded p-6 text-center">
              <Package className="w-8 h-8 text-parchment-500/30 mx-auto mb-2" />
              <p className="text-parchment-500 text-sm">No items listed for sale.</p>
              <p className="text-parchment-500/60 text-xs mt-1">
                Marketplace listing coming soon. Use the Market page to buy and sell.
              </p>
            </div>
          </div>

          {/* Sales history (placeholder) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="font-display text-sm text-parchment-200">Sales History</span>
            </div>
            <div className="bg-dark-500 border border-dark-50 rounded p-4 text-center">
              <p className="text-parchment-500 text-xs">No sales yet.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
