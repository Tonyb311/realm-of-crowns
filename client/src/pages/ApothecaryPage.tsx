import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Coins, User, ShoppingCart } from 'lucide-react';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge } from '../components/ui/realm-index';
import { PageHeader } from '../components/layout/PageHeader';
import GoldAmount from '../components/shared/GoldAmount';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ListingItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description?: string;
}

interface PotionListing {
  id: string;
  price: number;
  quantity: number;
  listedAt: string;
  seller: { id: string; name: string };
  item: ListingItem;
}

interface BrowseResponse {
  listings: PotionListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BidResult {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ApothecaryPage() {
  const queryClient = useQueryClient();
  const [lastBuy, setLastBuy] = useState<{ name: string; price: number } | null>(null);

  // Fetch character for current town + gold
  const { data: character } = useQuery<{
    id: string;
    name: string;
    gold: number;
    currentTownId: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch potions from market
  const {
    data: browseData,
    isLoading,
    error,
  } = useQuery<BrowseResponse>({
    queryKey: ['market', 'browse', 'potions', townId],
    queryFn: async () =>
      (await api.get('/market/browse', { params: { isPotion: 'true', limit: 50 } })).data,
    enabled: !!townId,
  });

  // Place buy order mutation (same as MarketPage)
  const buyMutation = useMutation({
    mutationFn: async ({ listingId, bidPrice }: { listingId: string; bidPrice: number }) => {
      const res = await api.post('/market/buy', { listingId, bidPrice });
      return res.data as BidResult;
    },
    onSuccess: (_data, variables) => {
      const listing = listings.find((l) => l.id === variables.listingId);
      if (listing) setLastBuy({ name: listing.item.name, price: variables.bidPrice });
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const listings = browseData?.listings ?? [];
  const townName = town?.name ?? 'this town';
  const gold = character?.gold ?? 0;

  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Apothecary" />
        <RealmPanel title="Apothecary">
          <p className="text-xs text-realm-text-muted">You must be in a town to visit the apothecary.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Apothecary \u2014 ${townName}`} />

      {/* Buy success toast */}
      {lastBuy && (
        <div className="bg-realm-success/10 border border-realm-success/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-realm-success">
            <FlaskConical className="w-4 h-4" />
            <span>Purchased <strong>{lastBuy.name}</strong> for <GoldAmount amount={lastBuy.price} />!</span>
          </div>
          <button
            onClick={() => setLastBuy(null)}
            className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gold display */}
      <div className="flex items-center gap-2 text-xs text-realm-text-secondary">
        <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
        <span>Your gold: <GoldAmount amount={gold} /></span>
      </div>

      <RealmPanel title="Potions Available" className="relative">
        {listings.length > 0 && (
          <div className="absolute top-3 right-5">
            <RealmBadge variant="default">{listings.length}</RealmBadge>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 bg-realm-bg-800 rounded animate-pulse" />
            <div className="h-16 bg-realm-bg-800 rounded animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-xs text-realm-danger">Failed to load apothecary inventory.</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-8">
            <FlaskConical className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted">The apothecary shelves are empty!</p>
            <p className="text-xs text-realm-text-muted mt-1">No potions available. Check back later or brew some yourself.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const isOwn = listing.seller.id === character?.id;
              const cantAfford = gold < listing.price;

              return (
                <div
                  key={listing.id}
                  className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FlaskConical className="w-4 h-4 text-realm-teal-400 flex-shrink-0" />
                        <span className="text-sm font-display text-realm-text-primary">
                          {listing.item.name}
                        </span>
                        {listing.quantity > 1 && (
                          <span className="text-[10px] text-realm-text-muted">x{listing.quantity}</span>
                        )}
                      </div>

                      {listing.item.description && (
                        <p className="text-[11px] text-realm-text-muted mb-1 line-clamp-1">
                          {listing.item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px]">
                        <User className="w-3 h-3 text-realm-text-muted" />
                        <span className="text-realm-text-muted">{listing.seller.name}</span>
                        <span className="text-realm-text-muted">&middot;</span>
                        <Coins className="w-3 h-3 text-realm-gold-400" />
                        <span className="text-realm-gold-400 font-display">{listing.price}g</span>
                      </div>
                    </div>

                    <RealmButton
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        buyMutation.mutate({ listingId: listing.id, bidPrice: listing.price })
                      }
                      disabled={buyMutation.isPending || isOwn || cantAfford}
                      title={
                        isOwn
                          ? 'This is your listing'
                          : cantAfford
                            ? 'Not enough gold'
                            : `Buy for ${listing.price}g`
                      }
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      {buyMutation.isPending ? 'Buying...' : 'Buy'}
                    </RealmButton>
                  </div>
                </div>
              );
            })}

            {buyMutation.isError && (
              <p className="text-xs text-realm-danger mt-2">
                {(buyMutation.error as any)?.response?.data?.error || 'Failed to purchase potion.'}
              </p>
            )}
          </div>
        )}
      </RealmPanel>
    </div>
  );
}
