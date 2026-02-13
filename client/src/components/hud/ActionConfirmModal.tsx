import { AlertTriangle, Loader2 } from 'lucide-react';
import { RealmModal } from '../ui/RealmModal';
import { RealmButton } from '../ui/RealmButton';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: string;   // "Gather", "Travel", "Craft"
  actionDetail: string; // "Iron Ore at Ironvault Mine", "Travel to Silverwood"
  isPending?: boolean;
}

/**
 * Confirmation dialog shown before committing the player's daily action.
 * Makes the cost of the action clear and irreversible nature explicit.
 */
export function ActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  actionDetail,
  isPending = false,
}: ActionConfirmModalProps) {
  return (
    <RealmModal isOpen={isOpen} onClose={onClose} title="Commit Your Daily Action">
      <div className="space-y-5">
        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-realm-gold-400/10 border border-realm-gold-400/20 rounded-md p-3">
          <AlertTriangle className="w-5 h-5 text-realm-gold-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-realm-text-primary font-semibold">
              This is your only action for today.
            </p>
            <p className="text-xs text-realm-text-muted mt-1">
              Once committed, this cannot be undone. You will need to wait until the next daily tick to act again.
            </p>
          </div>
        </div>

        {/* Action detail */}
        <div className="bg-realm-bg-800 border border-realm-border rounded-md p-4 text-center">
          <p className="text-xs text-realm-text-muted uppercase tracking-wider mb-1 font-display">
            {actionType}
          </p>
          <p className="text-lg text-realm-gold-400 font-display">
            {actionDetail}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <RealmButton
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </RealmButton>
          <RealmButton
            variant="primary"
            className="flex-1"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Committing...
              </>
            ) : (
              'Commit Action'
            )}
          </RealmButton>
        </div>
      </div>
    </RealmModal>
  );
}
