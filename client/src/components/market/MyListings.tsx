import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Users, Loader2 } from 'lucide-react';
import { RealmButton } from '../ui/RealmButton';
import { RealmBadge } from '../ui/RealmBadge';
import { RealmSkeleton } from '../ui/RealmSkeleton';
import GoldAmount from '../shared/GoldAmount';
import { RarityBadge } from './ListingCard';
import { RARITY_TEXT_COLORS } from '../../constants';
import api from '../../services/api';

interface MyListingItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
}

interface MyListing {
  id: string;
  price: number;
  quantity: number;
  status: string;
  listedAt: string;
  expiresAt: string;
  town?: { id: string; name: string };
  item: MyListingItem;
  buyOrderCount: number;
}

interface MyListingsResponse {
  listings: MyListing[];
}

interface MyListingsProps {
  onListItem: () => void;
}

export default function MyListings({ onListItem }: MyListingsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MyListingsResponse>({
    queryKey: ['market', 'my-listings'],
    queryFn: async () => (await api.get('/market/my-listings')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return (await api.delete(`/market/listings/${listingId}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['characters', 'current'] });
    },
  });

  const listings = data?.listings ?? [];

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <RealmBadge variant="uncommon">Active</RealmBadge>;
      case 'sold':
        return <RealmBadge variant="legendary">Sold</RealmBadge>;
      case 'cancelled':
        return <RealmBadge variant="default">Cancelled</RealmBadge>;
      case 'expired':
        return <RealmBadge variant="common">Expired</RealmBadge>;
      default:
        return <RealmBadge variant="default">{status}</RealmBadge>;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display text-realm-text-primary">Your Listings</h2>
        <RealmButton variant="primary" size="md" onClick={onListItem}>
          List Item
        </RealmButton>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <RealmSkeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !listings.length ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
          <p className="text-realm-text-muted mb-2">You have no listings.</p>
          <p className="text-realm-text-muted/60 text-sm">
            List items from your inventory to start selling.
          </p>
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
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Orders</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Status</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Listed</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/50">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-realm-bg-600/30 transition-colors">
                  <td
                    className={`px-4 py-3 text-sm font-semibold ${
                      RARITY_TEXT_COLORS[listing.item.rarity] ?? 'text-realm-text-primary'
                    }`}
                  >
                    {listing.item.name}
                  </td>
                  <td className="px-4 py-3">
                    <RarityBadge rarity={listing.item.rarity} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <GoldAmount amount={listing.price} className="text-realm-gold-400" />
                  </td>
                  <td className="px-4 py-3 text-sm text-realm-text-secondary">
                    {listing.quantity}
                  </td>
                  <td className="px-4 py-3">
                    {listing.buyOrderCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-realm-text-secondary">
                        <Users className="w-3 h-3" />
                        {listing.buyOrderCount}
                      </span>
                    ) : (
                      <span className="text-xs text-realm-text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(listing.status)}</td>
                  <td className="px-4 py-3 text-xs text-realm-text-muted">
                    {new Date(listing.listedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {listing.status === 'active' && (
                      <RealmButton
                        variant="danger"
                        size="sm"
                        onClick={() => cancelMutation.mutate(listing.id)}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </RealmButton>
                    )}
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
