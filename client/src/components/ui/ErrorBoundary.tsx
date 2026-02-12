import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// P1 #22: Top-level error boundary to prevent white-screen crashes
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-realm-bg-900 p-8">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-display text-realm-gold-400 mb-4">Something went wrong</h1>
            <p className="text-realm-text-secondary mb-6">
              An unexpected error occurred. Please reload the page to continue your adventure.
            </p>
            {this.state.error && (
              <p className="text-realm-text-muted text-xs mb-6 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-lg rounded hover:bg-realm-gold-400 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
