import React from 'react';

interface RealmCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function RealmCard({ children, className = '', onClick, selected = false }: RealmCardProps) {
  const baseClasses = 'bg-realm-bg-600 border border-realm-border rounded-md transition-all duration-200 p-4';
  const clickableClasses = onClick
    ? 'cursor-pointer hover:border-realm-border-strong hover:shadow-realm-glow'
    : '';
  const selectedClasses = selected
    ? 'border-realm-gold-500/50 shadow-realm-glow bg-realm-bg-500'
    : '';

  return (
    <div
      className={`${baseClasses} ${clickableClasses} ${selectedClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
