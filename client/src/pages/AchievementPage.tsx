import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Lock, Loader2, Clock } from 'lucide-react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
  reward?: string;
  progress?: { current: number; required: number };
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------
const CATEGORY_ORDER = ['Combat', 'Crafting', 'Social', 'Exploration', 'Economy', 'Political', 'Leveling'];

const CATEGORY_COLORS: Record<string, string> = {
  Combat: 'border-realm-danger/40 bg-realm-danger/20',
  Crafting: 'border-realm-gold-500/40 bg-realm-gold-500/20',
  Social: 'border-pink-500/40 bg-pink-900/20',
  Exploration: 'border-realm-success/40 bg-realm-success/20',
  Economy: 'border-realm-gold-500/40 bg-realm-gold-500/10',
  Political: 'border-realm-purple-300/40 bg-realm-purple-300/20',
  Leveling: 'border-realm-teal-300/40 bg-realm-teal-300/20',
};

// ---------------------------------------------------------------------------
// Achievement Card
// ---------------------------------------------------------------------------
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const borderCls = achievement.unlocked
    ? 'border-realm-gold-500/50'
    : 'border-realm-border opacity-60';

  return (
    <div className={`bg-realm-bg-700 border-2 ${borderCls} rounded-lg p-4 transition-all hover:bg-realm-bg-600/30`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          achievement.unlocked
            ? 'bg-realm-gold-500/20 border border-realm-gold-500/30'
            : 'bg-realm-bg-600/40 border border-realm-border'
        }`}>
          {achievement.unlocked ? (
            <Trophy className="w-5 h-5 text-realm-gold-400" />
          ) : (
            <Lock className="w-5 h-5 text-realm-text-muted/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display text-sm ${
            achievement.unlocked ? 'text-realm-text-primary' : 'text-realm-text-muted'
          }`}>
            {achievement.name}
          </h3>
          <p className={`text-xs mt-0.5 ${
            achievement.unlocked ? 'text-realm-text-secondary' : 'text-realm-text-muted/60'
          }`}>
            {achievement.unlocked ? achievement.description : '???'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {achievement.progress && !achievement.unlocked && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-realm-text-muted">Progress</span>
            <span className="text-realm-text-secondary">
              {achievement.progress.current}/{achievement.progress.required}
            </span>
          </div>
          <div className="h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-realm-gold-500/60 transition-all"
              style={{
                width: `${achievement.progress.required > 0 ? Math.min(100, (achievement.progress.current / achievement.progress.required) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Unlock date + reward */}
      {achievement.unlocked && (
        <div className="mt-3 flex items-center justify-between text-[10px]">
          {achievement.unlockedAt && (
            <span className="text-realm-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          )}
          {achievement.reward && (
            <span className="text-realm-gold-400 font-display">{achievement.reward}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AchievementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data.achievements ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  const allAchievements = achievements ?? [];
  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;

  // Group by category
  const grouped: Record<string, Achievement[]> = {};
  for (const a of allAchievements) {
    const cat = a.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  const categories = Object.keys(grouped).sort(
    (a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a);
      const bIdx = CATEGORY_ORDER.indexOf(b);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    }
  );

  const filteredAchievements = selectedCategory
    ? (grouped[selectedCategory] ?? [])
    : allAchievements;

  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Achievements</h1>
                <p className="text-realm-text-muted text-sm">
                  {unlockedCount} / {allAchievements.length} unlocked
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded font-display text-xs border transition-colors ${
              selectedCategory === null
                ? 'border-realm-gold-500 text-realm-gold-400 bg-realm-gold-500/10'
                : 'border-realm-border text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-text-muted/30'
            }`}
          >
            All ({allAchievements.length})
          </button>
          {categories.map((cat) => {
            const count = grouped[cat].length;
            const unlockedInCat = grouped[cat].filter((a) => a.unlocked).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded font-display text-xs border transition-colors ${
                  selectedCategory === cat
                    ? 'border-realm-gold-500 text-realm-gold-400 bg-realm-gold-500/10'
                    : (CATEGORY_COLORS[cat]?.split(' ')[0] ?? 'border-realm-border') +
                      ' text-realm-text-muted hover:text-realm-text-secondary'
                }`}
              >
                {cat} ({unlockedInCat}/{count})
              </button>
            );
          })}
        </div>

        {/* Achievement grid */}
        {filteredAchievements.length === 0 ? (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
            <Trophy className="w-12 h-12 text-realm-text-muted/20 mx-auto mb-3" />
            <p className="text-realm-text-muted text-sm">No achievements in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
