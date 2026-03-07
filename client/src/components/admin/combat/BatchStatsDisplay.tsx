import { Swords, Target, RotateCcw, LogOut } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface SimResult {
  winner: string;
  rounds: number;
  playerHpRemaining: number;
  monsterHpRemaining: number;
}

interface SimSummary {
  playerWins: number;
  monsterWins: number;
  draws: number;
  playerWinRate: number;
  avgRounds: number;
  avgPlayerHpRemaining: number;
}

interface BatchStatsDisplayProps {
  results: SimResult[];
  summary: SimSummary;
  config: {
    playerLevel: number;
    playerHP: number;
    monsterName: string;
    monsterHP: number;
    iterations: number;
  };
}

export default function BatchStatsDisplay({ results, summary, config }: BatchStatsDisplayProps) {
  // Win rate chart data
  const winData = [
    { name: 'Player Wins', value: summary.playerWins, color: '#4ade80' },
    { name: 'Monster Wins', value: summary.monsterWins, color: '#f87171' },
    { name: 'Draws', value: summary.draws, color: '#6b7280' },
  ].filter((d) => d.value > 0);

  // Rounds distribution
  const roundBuckets: Record<string, number> = {};
  for (const r of results) {
    const bucket = r.rounds <= 3 ? '1-3' : r.rounds <= 6 ? '4-6' : r.rounds <= 10 ? '7-10' : r.rounds <= 20 ? '11-20' : '21+';
    roundBuckets[bucket] = (roundBuckets[bucket] ?? 0) + 1;
  }
  const roundDistData = ['1-3', '4-6', '7-10', '11-20', '21+']
    .filter((k) => roundBuckets[k])
    .map((k) => ({ rounds: k, count: roundBuckets[k] ?? 0 }));

  // HP remaining distribution for player wins
  const playerWinResults = results.filter((r) => r.winner === 'player');
  const avgHpPct = playerWinResults.length > 0
    ? (playerWinResults.reduce((s, r) => s + r.playerHpRemaining, 0) / playerWinResults.length / config.playerHP * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Swords}
          iconColor="text-green-400"
          value={`${summary.playerWinRate}%`}
          label="Player Win Rate"
        />
        <StatCard
          icon={Target}
          iconColor="text-realm-gold-400"
          value={`${summary.avgRounds}`}
          label="Avg Rounds"
        />
        <StatCard
          icon={RotateCcw}
          iconColor="text-realm-teal-300"
          value={`${avgHpPct}%`}
          label="Avg HP Remaining (Wins)"
        />
        <StatCard
          icon={LogOut}
          iconColor="text-realm-text-muted"
          value={`${config.iterations}`}
          label="Total Iterations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate Chart */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h4 className="font-display text-realm-text-primary text-sm mb-4">Win Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={winData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {winData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Textual breakdown */}
          <div className="mt-3 flex items-center justify-center gap-6 text-xs">
            <span className="text-green-400">
              Player: {summary.playerWins} ({summary.playerWinRate}%)
            </span>
            <span className="text-red-400">
              {config.monsterName}: {summary.monsterWins} ({(summary.monsterWins / config.iterations * 100).toFixed(1)}%)
            </span>
            {summary.draws > 0 && (
              <span className="text-realm-text-muted">
                Draw: {summary.draws} ({(summary.draws / config.iterations * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        {/* Rounds Distribution */}
        {roundDistData.length > 0 && (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h4 className="font-display text-realm-text-primary text-sm mb-4">Rounds Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roundDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="rounds" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Results Table (first 50 rows) */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h4 className="font-display text-realm-text-primary text-sm mb-3">
          Results Sample ({Math.min(results.length, 50)} of {results.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-realm-text-muted text-xs border-b border-realm-border">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Winner</th>
                <th className="text-right py-2 px-2">Rounds</th>
                <th className="text-right py-2 px-2">Player HP</th>
                <th className="text-right py-2 px-2">Monster HP</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b border-realm-border/30 hover:bg-realm-bg-800/30">
                  <td className="py-1.5 px-2 text-realm-text-muted">{i + 1}</td>
                  <td className="py-1.5 px-2">
                    <span className={`font-display text-xs px-2 py-0.5 rounded-sm ${
                      r.winner === 'player' ? 'bg-green-500/20 text-green-400' :
                      r.winner === 'monster' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {r.winner === 'player' ? 'Player' : r.winner === 'monster' ? config.monsterName : 'Draw'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right text-realm-text-secondary">{r.rounds}</td>
                  <td className="py-1.5 px-2 text-right text-realm-text-secondary">{r.playerHpRemaining}</td>
                  <td className="py-1.5 px-2 text-right text-realm-text-secondary">{r.monsterHpRemaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, value, label }: {
  icon: typeof Swords;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-realm-text-muted text-xs font-display uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <span className={`text-xl font-display ${iconColor}`}>{value}</span>
    </div>
  );
}
