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
        <h4 className="text-xs font-display text-realm-text-muted uppercase tracking-wider mb-2">
          Materials for Level {targetLevel}
        </h4>
        <div className="space-y-1.5">
          {materialProgress.map((mat) => {
            const satisfied = mat.deposited >= mat.required;
            return (
              <div key={mat.itemName} className="flex items-center gap-2">
                {satisfied ? (
                  <CheckCircle2 className="w-4 h-4 text-realm-success flex-shrink-0" />
                ) : (
                  <Package className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${satisfied ? 'text-realm-success' : 'text-realm-text-secondary'}`}>
                  {mat.itemName}
                </span>
                <span className={`text-xs font-display ${satisfied ? 'text-realm-success' : 'text-realm-danger'}`}>
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
                <CheckCircle2 className="w-4 h-4 text-realm-success" />
              ) : (
                <Loader2 className="w-4 h-4 text-realm-gold-400 animate-spin" />
              )}
              <span className="text-xs text-realm-text-muted">
                {isComplete ? 'Construction complete!' : 'Under construction...'}
              </span>
            </div>
            <span className="text-xs text-realm-text-muted">{remainingText}</span>
          </div>
          <div className="h-3 bg-realm-bg-900 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                isComplete ? 'bg-realm-success' : 'bg-realm-gold-500'
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
        <div className="flex items-center gap-2 text-sm text-realm-text-muted">
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
          className="w-full py-2.5 bg-realm-success text-realm-text-primary font-display text-sm rounded hover:bg-realm-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCompleting ? 'Completing...' : 'Complete Construction'}
        </button>
      )}
    </div>
  );
}
