import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { LevelUpPayload } from '../hooks/useProgressionEvents';

interface LevelUpCelebrationProps {
  data: LevelUpPayload;
  onDismiss: () => void;
}

export default function LevelUpCelebration({ data, onDismiss }: LevelUpCelebrationProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onDismiss}
    >
      <div
        className="bg-realm-bg-800 border-2 border-realm-gold-500 rounded-lg p-8 max-w-sm w-full mx-4 text-center shadow-lg shadow-primary-400/20 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Star className="w-16 h-16 text-realm-gold-400 mx-auto mb-4" />
        <h2 className="text-4xl font-display text-realm-gold-400 mb-1">LEVEL UP!</h2>
        <p className="text-5xl font-display text-realm-text-primary mb-6">{data.newLevel}</p>

        <div className="space-y-2 mb-6">
          {data.statPoints > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">Stat Points</span>
              <span className="text-realm-success font-display">+{data.statPoints}</span>
            </div>
          )}
          {data.skillPoints > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">Skill Points</span>
              <span className="text-realm-teal-300 font-display">+{data.skillPoints}</span>
            </div>
          )}
          {data.maxHealthGain > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">Max HP</span>
              <span className="text-realm-danger font-display">+{data.maxHealthGain}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
          >
            Continue
          </button>
          <button
            onClick={() => { onDismiss(); navigate('/skills'); }}
            className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
          >
            Allocate Stats
          </button>
        </div>
      </div>
    </div>
  );
}
