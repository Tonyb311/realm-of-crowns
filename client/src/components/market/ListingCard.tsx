import { Users } from 'lucide-react';
import GoldAmount from '../shared/GoldAmount';
import { RARITY_BADGE_COLORS, RARITY_TEXT_COLORS } from '../../constants';
import type { AuctionListing } from './BidModal';

export type { AuctionListing };

export function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
        RARITY_BADGE_COLORS[rarity] ??
        'text-realm-text-primary bg-realm-text-primary/10 border-realm-text-primary/30'
      }`}
    >
      {rarity}
    </span>
  );
}

interface ListingCardProps {
  listing: AuctionListing;
  onSelect: (listing: AuctionListing) => void;
  onPlaceOrder: (listing: AuctionListing) => void;
}

export default function ListingCard({
  listing,
  onSelect,
  onPlaceOrder,
}: ListingCardProps) {
  // Determine bid count display
  let bidCountLabel: string | null = null;
  if (listing.buyOrderCount !== null && listing.buyOrderCount !== undefined) {
    // Merchant view -- exact count
    if (listing.buyOrderCount > 0) {
      bidCountLabel = `${listing.buyOrderCount} offer${listing.buyOrderCount !== 1 ? 's' : ''}`;
    }
  } else if (listing.hasMultipleBids) {
    bidCountLabel = 'Multiple offers';
  }

  return (
    <div
      className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 hover:border-realm-gold-400/40 transition-colors cursor-pointer"
      onClick={() => onSelect(listing)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3
          className={`font-display text-sm ${
            RARITY_TEXT_COLORS[listing.item.rarity] ?? 'text-realm-text-primary'
          }`}
        >
          {listing.item.name}
        </h3>
        <RarityBadge rarity={listing.item.rarity} />
      </div>
      <p className="text-realm-text-muted text-xs mb-3 capitalize">{listing.item.type}</p>

      <div className="flex items-center justify-between">
        <GoldAmount
          amount={listing.price}
          className="text-realm-gold-400 font-semibold text-sm"
        />
        <span className="text-realm-text-muted text-xs">x{listing.quantity}</span>
      </div>

      <p className="text-realm-text-muted/70 text-[10px] mt-2">
        Seller: {listing.seller.name}
      </p>

      {/* Bid count indicator */}
      {bidCountLabel && (
        <div className="flex items-center gap-1 mt-2">
          <Users className="w-3 h-3 text-realm-text-muted" />
          <span className="text-realm-text-muted text-[10px]">{bidCountLabel}</span>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlaceOrder(listing);
        }}
        className="mt-3 w-full py-1.5 bg-realm-gold-400/20 text-realm-gold-400 text-xs font-display rounded border border-realm-gold-400/30 hover:bg-realm-gold-400/30 transition-colors"
      >
        Place Order
      </button>
    </div>
  );
}
