import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gavel, AlertCircle } from 'lucide-react';
import { RealmModal } from '../ui/RealmModal';
import { RealmButton } from '../ui/RealmButton';
import GoldAmount from '../shared/GoldAmount';
import { RARITY_TEXT_COLORS } from '../../constants';
import api from '../../services/api';

interface ListingItem {
  id: string;
  templateId?: string;
  name: string;
  type: string;
  rarity: string;
  description?: string;
  stats?: Record<string, number>;
  quality?: string;
}

interface ListingSeller {
  id: string;
  name: string;
}

export interface AuctionListing {
  id: string;
  price: number;
  quantity: number;
  listedAt: string;
  expiresAt: string;
  status: string;
  seller: ListingSeller;
  item: ListingItem;
  buyOrderCount: number | null;
  hasMultipleBids: boolean;
}

interface CharacterData {
  id: string;
  name: string;
  gold: number;
  escrowedGold?: number;
  currentTownId: string | null;
  currentTownName?: string;
  professions?: Array<{ name: string }>;
}

interface BidModalProps {
  listing: AuctionListing;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BidModal({ listing, onClose, onSuccess }: BidModalProps) {
  const queryClient = useQueryClient();
  const [bidPrice, setBidPrice] = useState(listing.price);

  const { data: character } = useQuery<CharacterData>({
    queryKey: ['characters', 'current'],
    queryFn: async () => (await api.get('/characters/current')).data,
  });

  const gold = character?.gold ?? 0;
  const escrowedGold = character?.escrowedGold ?? 0;
  const availableGold = gold;

  const isMerchant = character?.professions?.some(
    (p) => p.name.toLowerCase() === 'merchant'
  ) ?? false;

  const bidMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/market/buy', { listingId: listing.id, bidPrice })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['characters', 'current'] });
      onSuccess();
    },
  });

  const canAfford = bidPrice <= availableGold;
  const validBid = bidPrice >= listing.price;

  // Bid count display
  let bidCountText = '';
  if (listing.buyOrderCount !== null && listing.buyOrderCount !== undefined) {
    bidCountText = `${listing.buyOrderCount} existing order${listing.buyOrderCount !== 1 ? 's' : ''}`;
  } else if (listing.hasMultipleBids) {
    bidCountText = 'Multiple orders placed';
  } else {
    bidCountText = 'No other orders';
  }

  return (
    <RealmModal isOpen onClose={onClose} title="Place Buy Order">
      <div className="space-y-4">
        {/* Item info */}
        <div className="bg-realm-bg-900 border border-realm-border rounded p-3">
          <h4
            className={`font-display text-sm mb-1 ${
              RARITY_TEXT_COLORS[listing.item.rarity] ?? 'text-realm-text-primary'
            }`}
          >
            {listing.item.name}
          </h4>
          <p className="text-realm-text-muted text-xs capitalize">
            {listing.item.type}
            {listing.item.quality ? ` - ${listing.item.quality}` : ''}
          </p>
          {listing.item.description && (
            <p className="text-realm-text-secondary text-xs mt-1 leading-relaxed">
              {listing.item.description}
            </p>
          )}
        </div>

        {/* Asking price and bid count */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-realm-text-muted text-xs">Asking Price</p>
            <GoldAmount amount={listing.price} className="text-realm-gold-400 font-display" />
          </div>
          <div className="text-right">
            <p className="text-realm-text-muted text-xs">Competition</p>
            <p className="text-realm-text-secondary text-xs">{bidCountText}</p>
          </div>
        </div>

        {/* Bid amount input */}
        <div>
          <label className="text-realm-text-muted text-xs mb-1 block">
            Your Bid (minimum: {listing.price}g)
          </label>
          <input
            type="number"
            value={bidPrice}
            onChange={(e) => setBidPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
            min={listing.price}
            className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
          />
          {!validBid && bidPrice > 0 && (
            <p className="text-realm-danger text-xs mt-1">
              Bid must be at least {listing.price}g (the asking price).
            </p>
          )}
        </div>

        {/* Gold available */}
        <div className="bg-realm-bg-900 border border-realm-border rounded p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-realm-text-muted">Available Gold</span>
            <GoldAmount amount={availableGold} className="text-realm-text-primary" />
          </div>
          {escrowedGold > 0 && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-realm-text-muted">In Escrow</span>
              <GoldAmount amount={escrowedGold} className="text-realm-text-muted" />
            </div>
          )}
          {!canAfford && (
            <div className="flex items-center gap-1.5 mt-2 text-realm-danger text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>You do not have enough gold for this bid.</span>
            </div>
          )}
        </div>

        {/* Info text about auction mechanics */}
        <p className="text-realm-text-muted/70 text-[10px] leading-relaxed">
          Your gold will be held in escrow until the auction resolves. If you lose,
          your gold is refunded. Winners are determined by a d20 roll plus modifiers
          (bid amount, CHA bonus, Merchant profession).
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <RealmButton variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </RealmButton>
          <RealmButton
            variant="primary"
            size="md"
            onClick={() => bidMutation.mutate()}
            disabled={bidMutation.isPending || !canAfford || !validBid}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Gavel className="w-4 h-4" />
            {bidMutation.isPending ? 'Placing...' : 'Place Order'}
          </RealmButton>
        </div>

        {bidMutation.isError && (
          <p className="text-realm-danger text-xs text-center">
            Failed to place order. Please try again.
          </p>
        )}
      </div>
    </RealmModal>
  );
}
