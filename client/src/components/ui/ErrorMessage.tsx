import { AlertCircle, RefreshCw, WifiOff, ShieldX, FileQuestion } from 'lucide-react';

interface ErrorMessageProps {
  error?: Error | { message?: string; response?: { status?: number } } | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function getErrorInfo(error?: ErrorMessageProps['error'], fallbackMessage?: string) {
  const status = (error as any)?.response?.status;

  if (status === 401 || status === 403) {
    return {
      icon: ShieldX,
      title: 'Access Denied',
      message: status === 401
        ? 'Your session has expired. Please log in again.'
        : 'You do not have permission to access this resource.',
    };
  }

  if (status === 404) {
    return {
      icon: FileQuestion,
      title: 'Not Found',
      message: 'The requested resource could not be found.',
    };
  }

  if (!navigator.onLine || (error as any)?.code === 'ERR_NETWORK') {
    return {
      icon: WifiOff,
      title: 'Connection Lost',
      message: 'Unable to reach the server. Check your internet connection.',
    };
  }

  return {
    icon: AlertCircle,
    title: 'Something Went Wrong',
    message: fallbackMessage || error?.message || 'An unexpected error occurred. Please try again.',
  };
}

export default function ErrorMessage({
  error,
  message,
  onRetry,
  className = '',
}: ErrorMessageProps) {
  const info = getErrorInfo(error, message);
  const Icon = info.icon;

  return (
    <div
      className={`bg-dark-300 border border-blood-dark/40 rounded-lg p-6 text-center ${className}`}
    >
      <Icon className="w-10 h-10 text-blood-light mx-auto mb-3" />
      <h3 className="font-display text-blood-light text-lg mb-1">{info.title}</h3>
      <p className="text-parchment-400 text-sm mb-4 max-w-md mx-auto">{info.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2 border border-primary-400/50 text-primary-400 font-display text-sm rounded hover:bg-dark-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
