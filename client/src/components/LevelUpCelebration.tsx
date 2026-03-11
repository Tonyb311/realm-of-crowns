import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Star } from 'lucide-react';
import type { LevelUpPayload } from '../hooks/useProgressionEvents';
import { FeatSelectionModal } from './feats/FeatSelectionPanel';

interface LevelUpCelebrationProps {
  data: LevelUpPayload;
  onDismiss: () => void;
}

export default function LevelUpCelebration({ data, onDismiss }: LevelUpCelebrationProps) {
  const navigate = useNavigate();
  const [showFeatModal, setShowFeatModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (showFeatModal) {
    return <FeatSelectionModal onClose={() => { setShowFeatModal(false); onDismiss(); }} />;
  }

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
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded-sm px-4 py-2">
              <span className="text-realm-text-muted">Stat Points</span>
              <span className="text-realm-success font-display">+{data.statPoints}</span>
            </div>
          )}
          {data.abilitiesGranted && data.abilitiesGranted.length > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded-sm px-4 py-2">
              <span className="text-realm-text-muted">New Abilities</span>
              <span className="text-realm-teal-300 font-display">+{data.abilitiesGranted.length}</span>
            </div>
          )}
          {data.maxHealthGain > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded-sm px-4 py-2">
              <span className="text-realm-text-muted">Max HP</span>
              <span className="text-realm-danger font-display">+{data.maxHealthGain}</span>
            </div>
          )}
        </div>

        {data.tier0Pending && data.tier0Pending > 0 && (
          <div className="mb-4 px-4 py-2 bg-realm-teal-500/10 border border-realm-teal-500/30 rounded-sm text-sm text-realm-teal-300">
            {data.tier0Pending} ability {data.tier0Pending === 1 ? 'choice' : 'choices'} available!
          </div>
        )}

        {data.featPending && (
          <div className="mb-4 px-4 py-2 bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-sm text-sm text-realm-gold-300">
            New feat available! A permanent power awaits.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-700 transition-colors"
          >
            Continue
          </button>
          {data.featPending ? (
            <button
              onClick={() => setShowFeatModal(true)}
              className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors"
            >
              Choose Feat
            </button>
          ) : data.tier0Pending && data.tier0Pending > 0 ? (
            <button
              onClick={() => { onDismiss(); navigate('/skills'); }}
              className="flex-1 py-2.5 bg-realm-teal-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-teal-400 transition-colors"
            >
              Choose Abilities
            </button>
          ) : (
            <button
              onClick={() => { onDismiss(); navigate('/skills'); }}
              className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors"
            >
              Allocate Stats
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
