import React from 'react';

interface RealmPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'inset';
}

const variantClasses: Record<NonNullable<RealmPanelProps['variant']>, string> = {
  default:
    'bg-realm-bg-700 border border-realm-border rounded-md shadow-realm-panel bg-realm-panel-gradient',
  elevated:
    'bg-realm-bg-600 border border-realm-border rounded-md shadow-realm-glow bg-realm-panel-gradient',
  inset: 'bg-realm-bg-900 border border-realm-border rounded-md shadow-realm-inner',
};

export function RealmPanel({
  title,
  children,
  className = '',
  variant = 'default',
}: RealmPanelProps) {
  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {title && (
        <div className="border-b border-realm-border px-5 py-3">
          <h3 className="font-display text-realm-text-gold text-lg tracking-wide">{title}</h3>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
