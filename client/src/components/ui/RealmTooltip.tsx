import React from 'react';

interface RealmTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const positionClasses: Record<NonNullable<RealmTooltipProps['position']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function RealmTooltip({
  content,
  children,
  position = 'top',
  className = '',
}: RealmTooltipProps) {
  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={[
          'absolute z-50 bg-realm-bg-700 border border-realm-border rounded px-3 py-2',
          'shadow-realm-panel text-sm text-realm-text-primary whitespace-nowrap',
          'transition-all duration-200 opacity-0 invisible',
          'group-hover:opacity-100 group-hover:visible',
          'pointer-events-none',
          positionClasses[position],
          className,
        ].join(' ')}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  );
}
