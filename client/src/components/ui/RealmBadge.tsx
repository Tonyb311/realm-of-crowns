import React from 'react';

interface RealmBadgeProps {
  variant?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'default';
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<RealmBadgeProps['variant']>, string> = {
  default: 'border-realm-text-muted/50 text-realm-text-secondary',
  common: 'border-realm-text-muted text-realm-text-muted',
  uncommon: 'border-realm-success text-realm-success',
  rare: 'border-realm-teal-300 text-realm-teal-300',
  epic: 'border-realm-purple-300 text-realm-purple-300',
  legendary: 'border-realm-gold-300 text-realm-gold-300 shadow-realm-glow',
};

export function RealmBadge({ variant = 'default', children, className = '' }: RealmBadgeProps) {
  return (
    <span
      className={`font-display text-xs uppercase tracking-wider px-2 py-0.5 rounded-sm border inline-block ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
