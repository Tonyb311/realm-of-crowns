import { CircleDollarSign } from 'lucide-react';

export default function GoldAmount({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <CircleDollarSign className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}
