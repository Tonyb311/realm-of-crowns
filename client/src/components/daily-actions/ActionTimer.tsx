import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';

interface ActionTimerProps {
  isProcessing?: boolean;
}

function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0,
  ));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTimerColor(seconds: number): string {
  if (seconds > 4 * 3600) return 'text-realm-success';
  if (seconds > 3600) return 'text-realm-gold-400';
  if (seconds > 900) return 'text-orange-400';
  return 'text-realm-danger';
}

function getTimerBorder(seconds: number): string {
  if (seconds > 4 * 3600) return 'border-realm-success/30';
  if (seconds > 3600) return 'border-realm-gold-500/30';
  if (seconds > 900) return 'border-orange-500/30';
  return 'border-realm-danger/30';
}

export default function ActionTimer({ isProcessing = false }: ActionTimerProps) {
  const [seconds, setSeconds] = useState(getSecondsUntilMidnightUTC);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(getSecondsUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-realm-bg-800 border border-realm-gold-500/40 rounded-lg">
        <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin" />
        <span className="font-display text-realm-gold-400 text-sm tracking-wider">
          TICK PROCESSING...
        </span>
      </div>
    );
  }

  const shouldPulse = seconds < 3600;

  return (
    <div className={`flex items-center justify-center gap-3 px-4 py-3 bg-realm-bg-800 border ${getTimerBorder(seconds)} rounded-lg`}>
      <Clock className={`w-5 h-5 ${getTimerColor(seconds)} ${shouldPulse ? 'animate-pulse' : ''}`} />
      <div className="text-center">
        <p className="text-[10px] text-realm-text-muted uppercase tracking-wider">Next Daily Tick</p>
        <p className={`font-display text-lg tabular-nums tracking-wider ${getTimerColor(seconds)} ${shouldPulse ? 'animate-pulse' : ''}`}>
          {formatCountdown(seconds)}
        </p>
      </div>
    </div>
  );
}
