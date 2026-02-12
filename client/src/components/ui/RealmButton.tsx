import React from 'react';

interface RealmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<RealmButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-b from-realm-gold-400 to-realm-gold-500 text-realm-bg-900 hover:shadow-realm-glow-strong border border-realm-gold-600',
  secondary:
    'bg-transparent border border-realm-bronze-400/40 text-realm-text-primary hover:bg-realm-bronze-500/20 hover:border-realm-bronze-400/60',
  danger:
    'bg-realm-danger/80 border border-realm-danger text-realm-text-primary hover:bg-realm-danger',
  ghost: 'text-realm-text-secondary hover:text-realm-gold-400',
};

const sizeClasses: Record<NonNullable<RealmButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function RealmButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: RealmButtonProps) {
  return (
    <button
      className={[
        'font-display uppercase tracking-wider transition-all duration-200 rounded',
        'hover:scale-[1.02]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
