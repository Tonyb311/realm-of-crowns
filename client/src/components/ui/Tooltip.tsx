import { useState, useRef, useEffect, type ReactNode } from 'react';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  position?: Position;
  children: ReactNode;
  className?: string;
}

const POSITION_CLASSES: Record<Position, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_CLASSES: Record<Position, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-dark-600 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-dark-600 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-dark-600 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-dark-600 border-y-transparent border-l-transparent',
};

export default function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  function show() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  }

  function hide() {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-50 ${POSITION_CLASSES[position]} pointer-events-none`}
          role="tooltip"
        >
          <span className="block bg-dark-600 border border-dark-50 text-parchment-200 text-xs rounded px-3 py-1.5 shadow-lg whitespace-nowrap max-w-xs">
            {content}
          </span>
          <span
            className={`absolute w-0 h-0 border-4 ${ARROW_CLASSES[position]}`}
          />
        </span>
      )}
    </span>
  );
}
