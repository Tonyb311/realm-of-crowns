import GoldAmount from '../shared/GoldAmount';
import { RARITY_BADGE_COLORS, RARITY_TEXT_COLORS } from '../../constants';

export interface MarketListing {
  id: string;
  itemId: string;
  itemName: string;
  itemType: string;
  rarity: string;
  price: number;
  quantity: number;
  sellerName: string;
  sellerId: string;
  listedAt: string;
  expiresAt: string;
  description?: string;
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${RARITY_BADGE_COLORS[rarity] ?? 'text-parchment-200 bg-parchment-200/10 border-parchment-200/30'}`}>
      {rarity}
    </span>
  );
}

export { RarityBadge };

export default function ListingCard({
  listing,
  onSelect,
  onBuy,
}: {
  listing: MarketListing;
  onSelect: (listing: MarketListing) => void;
  onBuy: (listing: MarketListing) => void;
}) {
  return (
    <div
      className="bg-dark-300 border border-dark-50 rounded-lg p-4 hover:border-primary-400/40 transition-colors cursor-pointer"
      onClick={() => onSelect(listing)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-display text-sm ${RARITY_TEXT_COLORS[listing.rarity] ?? 'text-parchment-200'}`}>
          {listing.itemName}
        </h3>
        <RarityBadge rarity={listing.rarity} />
      </div>
      <p className="text-parchment-500 text-xs mb-3 capitalize">{listing.itemType}</p>
      <div className="flex items-center justify-between">
        <GoldAmount amount={listing.price} className="text-primary-400 font-semibold text-sm" />
        <span className="text-parchment-500 text-xs">x{listing.quantity}</span>
      </div>
      <p className="text-parchment-500/70 text-[10px] mt-2">Seller: {listing.sellerName}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onBuy(listing); }}
        className="mt-3 w-full py-1.5 bg-primary-400/20 text-primary-400 text-xs font-display rounded border border-primary-400/30 hover:bg-primary-400/30 transition-colors"
      >
        Buy
      </button>
    </div>
  );
}
