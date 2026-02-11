import { Package } from 'lucide-react';
import { SkeletonCard } from '../ui/LoadingSkeleton';
import GoldAmount from '../shared/GoldAmount';
import { RarityBadge, type MarketListing } from './ListingCard';
import { RARITY_TEXT_COLORS } from '../../constants';

interface MyListingsProps {
  listings: MarketListing[] | undefined;
  isLoading: boolean;
  onListItem: () => void;
  onCancel: (listingId: string) => void;
  cancelPending: boolean;
}

export default function MyListings({
  listings,
  isLoading,
  onListItem,
  onCancel,
  cancelPending,
}: MyListingsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display text-parchment-200">Your Active Listings</h2>
        <button
          onClick={onListItem}
          className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
        >
          List Item
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !listings?.length ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
          <p className="text-parchment-500 mb-2">You have no active listings.</p>
          <p className="text-parchment-500/60 text-sm">List items from your inventory to start selling.</p>
        </div>
      ) : (
        <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-50 text-left">
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Item</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Rarity</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Price</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Qty</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Listed</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Expires</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-50">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-dark-200/30 transition-colors">
                  <td className={`px-4 py-3 text-sm font-semibold ${RARITY_TEXT_COLORS[listing.rarity] ?? 'text-parchment-200'}`}>
                    {listing.itemName}
                  </td>
                  <td className="px-4 py-3">
                    <RarityBadge rarity={listing.rarity} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <GoldAmount amount={listing.price} className="text-primary-400" />
                  </td>
                  <td className="px-4 py-3 text-sm text-parchment-300">{listing.quantity}</td>
                  <td className="px-4 py-3 text-xs text-parchment-500">
                    {new Date(listing.listedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-parchment-500">
                    {new Date(listing.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onCancel(listing.id)}
                      disabled={cancelPending}
                      className="px-3 py-1 text-xs text-blood-light border border-blood-light/30 rounded hover:bg-blood-light/10 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
