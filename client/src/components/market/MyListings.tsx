import { Package } from 'lucide-react';
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
        <h2 className="text-xl font-display text-realm-text-primary">Your Active Listings</h2>
        <button
          onClick={onListItem}
          className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
        >
          List Item
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          ))}
        </div>
      ) : !listings?.length ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
          <p className="text-realm-text-muted mb-2">You have no active listings.</p>
          <p className="text-realm-text-muted/60 text-sm">List items from your inventory to start selling.</p>
        </div>
      ) : (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-realm-border text-left">
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Item</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Rarity</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Price</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Qty</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Listed</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Expires</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/50">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-realm-bg-600/30 transition-colors">
                  <td className={`px-4 py-3 text-sm font-semibold ${RARITY_TEXT_COLORS[listing.rarity] ?? 'text-realm-text-primary'}`}>
                    {listing.itemName}
                  </td>
                  <td className="px-4 py-3">
                    <RarityBadge rarity={listing.rarity} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <GoldAmount amount={listing.price} className="text-realm-gold-400" />
                  </td>
                  <td className="px-4 py-3 text-sm text-realm-text-secondary">{listing.quantity}</td>
                  <td className="px-4 py-3 text-xs text-realm-text-muted">
                    {new Date(listing.listedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-realm-text-muted">
                    {new Date(listing.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onCancel(listing.id)}
                      disabled={cancelPending}
                      className="px-3 py-1 text-xs text-realm-danger border border-realm-danger/30 rounded hover:bg-realm-danger/10 transition-colors disabled:opacity-50"
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
