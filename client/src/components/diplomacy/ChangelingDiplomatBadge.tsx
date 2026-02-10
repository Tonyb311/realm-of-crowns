import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ChangelingDiplomatBadgeProps {
  className?: string;
}

export default function ChangelingDiplomatBadge({ className = '' }: ChangelingDiplomatBadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      <span>-20% Treaty Cost</span>
    </motion.span>
  );
}
