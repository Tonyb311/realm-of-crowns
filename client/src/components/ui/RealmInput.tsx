import React, { forwardRef } from 'react';

interface RealmInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const RealmInput = forwardRef<HTMLInputElement, RealmInputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-body text-realm-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full px-3 py-2 bg-realm-bg-900 border rounded text-realm-text-primary placeholder-realm-text-muted',
            'focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none',
            'font-body transition-all duration-200',
            error ? 'border-realm-danger' : 'border-realm-border',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-realm-danger text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

RealmInput.displayName = 'RealmInput';
