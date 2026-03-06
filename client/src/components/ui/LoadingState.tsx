import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message, className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
      {message && (
        <p className="text-sm text-realm-text-muted mt-3">{message}</p>
      )}
    </div>
  );
}
