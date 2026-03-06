import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      {Icon && <Icon className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />}
      <h3 className="text-lg font-display text-realm-text-secondary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-realm-text-muted max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
