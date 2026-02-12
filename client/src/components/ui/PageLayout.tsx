import type { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '5xl' | '6xl' | '7xl';
  className?: string;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export default function PageLayout({
  children,
  title,
  subtitle,
  icon,
  headerRight,
  maxWidth = '7xl',
  className = '',
}: PageLayoutProps) {
  const widthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-7xl';

  return (
    <div className={`min-h-screen bg-realm-bg-900 pt-16 ${className}`}>
      {title && (
        <header className="border-b border-realm-border bg-realm-bg-800/50">
          <div className={`${widthClass} mx-auto px-4 py-6 sm:px-6 lg:px-8`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <h1 className="text-3xl font-display text-realm-gold-400">{title}</h1>
                  {subtitle && (
                    <p className="text-realm-text-muted text-sm">{subtitle}</p>
                  )}
                </div>
              </div>
              {headerRight && <div className="flex items-center gap-3">{headerRight}</div>}
            </div>
          </div>
        </header>
      )}
      <div className={`${widthClass} mx-auto px-4 py-8 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </div>
  );
}
