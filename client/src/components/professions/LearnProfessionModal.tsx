import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface LearnProfessionModalProps {
  professionName: string;
  professionType: string;
  description: string;
  slotsUsed: number;
  slotsMax: number;
  categoryLimits: { category: string; used: number; max: number }[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

export default function LearnProfessionModal({
  professionName,
  description,
  slotsUsed,
  slotsMax,
  categoryLimits,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: LearnProfessionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-dark-400 border border-dark-50 rounded-lg max-w-md w-full">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-parchment-500 hover:text-parchment-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 className="font-display text-xl text-primary-400 mb-2">
            Learn {professionName}?
          </h3>

          <p className="text-sm text-parchment-400 mb-4 line-clamp-3">
            {description}
          </p>

          {/* Slot info */}
          <div className="bg-dark-300 border border-dark-50 rounded p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-parchment-500">Profession Slots</span>
              <span className="text-xs font-display text-parchment-200">
                {slotsUsed}/{slotsMax} used
              </span>
            </div>
            {/* Slot dots */}
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: slotsMax }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded-full ${
                    i < slotsUsed
                      ? 'bg-primary-400'
                      : i === slotsUsed
                        ? 'bg-primary-400/40 animate-pulse'
                        : 'bg-dark-500'
                  }`}
                />
              ))}
            </div>

            {/* Category breakdown */}
            <div className="space-y-1">
              {categoryLimits.map((cl) => (
                <div key={cl.category} className="flex justify-between text-[10px]">
                  <span className="text-parchment-500 capitalize">
                    {cl.category.toLowerCase()}
                  </span>
                  <span className="text-parchment-400">
                    {cl.used}/{cl.max}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Learning...' : 'Confirm'}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 border border-parchment-500/30 text-parchment-400 font-display text-sm rounded hover:bg-dark-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
