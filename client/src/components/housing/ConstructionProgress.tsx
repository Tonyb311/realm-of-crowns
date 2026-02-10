import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Loader2, Package } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MaterialProgress {
  itemName: string;
  required: number;
  deposited: number;
}

interface TimeProgress {
  percent: number;
  remainingMinutes: number;
  completesAt: string;
  isComplete: boolean;
}

interface ConstructionProgressProps {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  targetLevel: number;
  materialProgress: MaterialProgress[];
  timeProgress: TimeProgress | null;
  onComplete?: () => void;
  isCompleting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ConstructionProgress({
  status,
  targetLevel,
  materialProgress,
  timeProgress,
  onComplete,
  isCompleting,
}: ConstructionProgressProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !timeProgress || timeProgress.isComplete) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status, timeProgress]);

  // Compute live progress
  let livePercent = timeProgress?.percent ?? 0;
  let remainingText = '';
  let isComplete = timeProgress?.isComplete ?? false;

  if (status === 'IN_PROGRESS' && timeProgress?.completesAt) {
    const completesAt = new Date(timeProgress.completesAt).getTime();
    const remaining = Math.max(0, completesAt - now);
    isComplete = remaining <= 0;
    if (!isComplete) {
      const totalMs = completesAt - (completesAt - timeProgress.remainingMinutes * 60000);
      livePercent = Math.min(100, Math.max(0, ((totalMs - remaining) / totalMs) * 100));
      const mins = Math.floor(remaining / 60000);
      const secs = Math.ceil((remaining % 60000) / 1000);
      remainingText = mins > 0 ? `${mins}m ${secs}s remaining` : `${secs}s remaining`;
    } else {
      livePercent = 100;
      remainingText = 'Complete!';
    }
  }

  const allMaterialsDeposited = materialProgress.every(m => m.deposited >= m.required);

  return (
    <div className="space-y-4">
      {/* Material checklist */}
      <div>
        <h4 className="text-xs font-display text-parchment-500 uppercase tracking-wider mb-2">
          Materials for Level {targetLevel}
        </h4>
        <div className="space-y-1.5">
          {materialProgress.map((mat) => {
            const satisfied = mat.deposited >= mat.required;
            return (
              <div key={mat.itemName} className="flex items-center gap-2">
                {satisfied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <Package className="w-4 h-4 text-parchment-500 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${satisfied ? 'text-green-400' : 'text-parchment-300'}`}>
                  {mat.itemName}
                </span>
                <span className={`text-xs font-display ${satisfied ? 'text-green-400' : 'text-red-400'}`}>
                  {mat.deposited}/{mat.required}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time progress bar */}
      {status === 'IN_PROGRESS' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              )}
              <span className="text-xs text-parchment-500">
                {isComplete ? 'Construction complete!' : 'Under construction...'}
              </span>
            </div>
            <span className="text-xs text-parchment-500">{remainingText}</span>
          </div>
          <div className="h-3 bg-dark-500 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                isComplete ? 'bg-green-500' : 'bg-primary-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${livePercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Pending status */}
      {status === 'PENDING' && (
        <div className="flex items-center gap-2 text-sm text-parchment-500">
          <Clock className="w-4 h-4" />
          {allMaterialsDeposited
            ? 'All materials deposited. Ready to start construction!'
            : 'Deposit all required materials to begin construction.'}
        </div>
      )}

      {/* Complete button */}
      {status === 'IN_PROGRESS' && isComplete && onComplete && (
        <button
          onClick={onComplete}
          disabled={isCompleting}
          className="w-full py-2.5 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCompleting ? 'Completing...' : 'Complete Construction'}
        </button>
      )}
    </div>
  );
}
