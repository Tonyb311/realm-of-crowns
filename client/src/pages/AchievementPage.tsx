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
  Combat: 'border-red-500/40 bg-red-900/20',
  Crafting: 'border-amber-500/40 bg-amber-900/20',
  Social: 'border-pink-500/40 bg-pink-900/20',
  Exploration: 'border-green-500/40 bg-green-900/20',
  Economy: 'border-primary-400/40 bg-primary-400/10',
  Political: 'border-purple-500/40 bg-purple-900/20',
  Leveling: 'border-blue-500/40 bg-blue-900/20',
};

// ---------------------------------------------------------------------------
// Achievement Card
// ---------------------------------------------------------------------------
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const borderCls = achievement.unlocked
    ? 'border-primary-400/50'
    : 'border-dark-50 opacity-60';

  return (
    <div className={`bg-dark-300 border-2 ${borderCls} rounded-lg p-4 transition-all hover:bg-dark-200/30`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          achievement.unlocked
            ? 'bg-primary-400/20 border border-primary-400/30'
            : 'bg-dark-50/40 border border-dark-50'
        }`}>
          {achievement.unlocked ? (
            <Trophy className="w-5 h-5 text-primary-400" />
          ) : (
            <Lock className="w-5 h-5 text-parchment-500/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display text-sm ${
            achievement.unlocked ? 'text-parchment-200' : 'text-parchment-500'
          }`}>
            {achievement.name}
          </h3>
          <p className={`text-xs mt-0.5 ${
            achievement.unlocked ? 'text-parchment-400' : 'text-parchment-500/60'
          }`}>
            {achievement.unlocked ? achievement.description : '???'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {achievement.progress && !achievement.unlocked && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-parchment-500">Progress</span>
            <span className="text-parchment-400">
              {achievement.progress.current}/{achievement.progress.required}
            </span>
          </div>
          <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-400/60 transition-all"
              style={{
                width: `${Math.min(100, (achievement.progress.current / achievement.progress.required) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Unlock date + reward */}
      {achievement.unlocked && (
        <div className="mt-3 flex items-center justify-between text-[10px]">
          {achievement.unlockedAt && (
            <span className="text-parchment-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          )}
          {achievement.reward && (
            <span className="text-primary-400 font-display">{achievement.reward}</span>
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
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
    (a, b) => (CATEGORY_ORDER.indexOf(a) ?? 99) - (CATEGORY_ORDER.indexOf(b) ?? 99)
  );

  const filteredAchievements = selectedCategory
    ? (grouped[selectedCategory] ?? [])
    : allAchievements;

  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">Achievements</h1>
                <p className="text-parchment-500 text-sm">
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
                ? 'border-primary-400 text-primary-400 bg-primary-400/10'
                : 'border-dark-50 text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30'
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
                    ? 'border-primary-400 text-primary-400 bg-primary-400/10'
                    : (CATEGORY_COLORS[cat]?.split(' ')[0] ?? 'border-dark-50') +
                      ' text-parchment-500 hover:text-parchment-300'
                }`}
              >
                {cat} ({unlockedInCat}/{count})
              </button>
            );
          })}
        </div>

        {/* Achievement grid */}
        {filteredAchievements.length === 0 ? (
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-12 text-center">
            <Trophy className="w-12 h-12 text-parchment-500/20 mx-auto mb-3" />
            <p className="text-parchment-500 text-sm">No achievements in this category.</p>
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
