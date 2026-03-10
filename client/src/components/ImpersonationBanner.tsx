import { useNavigate } from 'react-router';
import { Eye, X } from 'lucide-react';
import { useImpersonateStore } from '../stores/impersonateStore';

export default function ImpersonationBanner() {
  const { isImpersonating, characterName, characterMeta, stopImpersonating } = useImpersonateStore();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const metaText = characterMeta
    ? `L${characterMeta.level} ${characterMeta.race} ${characterMeta.className}`
    : '';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-realm-gold-500/90 backdrop-blur-sm border-b border-realm-gold-400">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-realm-bg-900" />
          <span className="text-sm font-display text-realm-bg-900">
            Viewing as: <span className="font-semibold">{characterName}</span>
            {metaText && <span className="ml-1 opacity-75">({metaText})</span>}
          </span>
          <span className="text-xs bg-realm-bg-900/20 text-realm-bg-900 px-2 py-0.5 rounded-sm font-display">
            READ ONLY
          </span>
        </div>
        <button
          onClick={() => {
            stopImpersonating();
            navigate('/admin/characters');
          }}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-display text-realm-bg-900 bg-realm-bg-900/20 rounded-sm hover:bg-realm-bg-900/30 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>
    </div>
  );
}
