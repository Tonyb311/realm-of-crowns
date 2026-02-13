import GoldAmount from '../shared/GoldAmount';

interface NetProceedsPreviewProps {
  askingPrice: number;
  feeRate: number;
  isMerchant: boolean;
}

export default function NetProceedsPreview({
  askingPrice,
  feeRate,
  isMerchant,
}: NetProceedsPreviewProps) {
  if (askingPrice <= 0) return null;

  const feePercent = Math.round(feeRate * 100);
  const feeAmount = Math.floor(askingPrice * feeRate);
  const netProceeds = askingPrice - feeAmount;

  return (
    <div className="bg-realm-bg-900 border border-realm-border rounded p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-realm-text-muted text-xs">
          After {feePercent}% fee:
        </span>
        {isMerchant && (
          <span className="text-realm-gold-400 text-[10px] font-display flex items-center gap-1">
            <span>*</span> Merchant Rate
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-realm-text-muted text-xs">You receive</span>
        <GoldAmount
          amount={netProceeds}
          className="text-realm-gold-400 font-display text-lg font-semibold"
        />
      </div>
      {feeAmount > 0 && (
        <p className="text-realm-text-muted/60 text-[10px] mt-1">
          Fee: {feeAmount}g deducted from sale price
        </p>
      )}
    </div>
  );
}
