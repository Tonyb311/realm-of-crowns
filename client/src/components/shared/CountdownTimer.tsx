import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ endDate }: { endDate: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = new Date(endDate).getTime();
  const diff = Math.max(0, end - now);

  if (diff <= 0) {
    return <span className="text-realm-text-muted text-xs">Ended</span>;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <span className="text-realm-gold-400 text-xs font-display flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {days > 0 && `${days}d `}{hours}h {minutes}m {seconds}s remaining
    </span>
  );
}
