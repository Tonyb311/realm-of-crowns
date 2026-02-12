import React from 'react';

interface RealmProgressProps {
  value: number;
  max?: number;
  variant?: 'hp' | 'xp' | 'default';
  label?: string;
  showValue?: boolean;
  className?: string;
}

const fillClasses: Record<NonNullable<RealmProgressProps['variant']>, string> = {
  hp: 'bg-gradient-to-r from-realm-hp to-red-500',
  xp: 'bg-gradient-to-r from-realm-gold-500 to-realm-gold-300',
  default: 'bg-gradient-to-r from-realm-teal-400 to-realm-teal-300',
};

export function RealmProgress({
  value,
  max = 100,
  variant = 'default',
  label,
  showValue = false,
  className = '',
}: RealmProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const bar = (
    <div className="bg-realm-bg-900 rounded-full h-3 overflow-hidden border border-realm-border relative flex-1">
      <div
        className={`rounded-full transition-all duration-500 h-full ${fillClasses[variant]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );

  return (
    <div className={className}>
      {label && <div className="text-xs text-realm-text-secondary mb-1">{label}</div>}
      {showValue ? (
        <div className="flex items-center">
          {bar}
          <span className="text-xs text-realm-text-muted ml-2">
            {value}/{max}
          </span>
        </div>
      ) : (
        bar
      )}
    </div>
  );
}
