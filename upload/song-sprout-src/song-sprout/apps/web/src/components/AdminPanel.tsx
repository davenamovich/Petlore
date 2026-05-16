import React, { useState, useEffect } from 'react';
import { Users, Music, Activity, Server, RefreshCw, AlertCircle, CheckCircle, Zap, Baby } from 'lucide-react';

interface AdminStats {
  totalUsers?: number;
  totalSongs?: number;
  totalKidsSongs?: number;
  activeJobs?: number;
  systemHealth?: { aceStep: boolean; ollama: boolean; db: boolean };
}

interface AdminPanelProps {
  token?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ token }) => {
  const [stats, setStats] = useState<AdminStats>({});
  const [loading, setLoading] = useState(true);
  const [recentKidsSongs, setRecentKidsSongs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [healthRes, kidsRes] = await Promise.all([
        fetch('/api/health', { headers }).catch(() => null),
        fetch('/api/kids/songs?limit=10', { headers }).catch(() => null),
      ]);

      const newStats: AdminStats = {};

      if (healthRes?.ok) {
        const health = await healthRes.json();
        newStats.systemHealth = {
          aceStep: health.aceStep?.status === 'ok' || health.aceStepConnected === true,
          ollama: health.ollama?.status === 'ok' || health.ollamaConnected === true,
          db: health.db?.status === 'ok' || health.dbConnected !== false,
        };
      } else {
        newStats.systemHealth = { aceStep: false, ollama: false, db: true };
      }

      if (kidsRes?.ok) {
        const data = await kidsRes.json();
        const songs = data.songs || [];
        setRecentKidsSongs(songs);
        newStats.totalKidsSongs = data.total ?? songs.length;
      }

      setStats(newStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const StatusDot: React.FC<{ ok?: boolean; label: string }> = ({ ok, label }) => (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-sm font-medium ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {label}: {ok ? 'Online' : 'Offline'}
      </span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-suno-DEFAULT p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Panel</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Song Sprout system overview</p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* System Health */}
        <div className="mb-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4" /> System Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusDot ok={stats.systemHealth?.aceStep} label="ACE-Step API" />
            <StatusDot ok={stats.systemHealth?.ollama} label="Ollama (Hermes)" />
            <StatusDot ok={stats.systemHealth?.db} label="Database" />
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/5">
            <p className="text-xs text-zinc-400">
              ACE-Step runs on port 8001 · Express server on port 7778 · Hermes3:8b via Ollama at port 11434
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Baby className="w-4 h-4" />
              <span className="text-sm font-medium">Kids songs generated</span>
            </div>
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {loading ? '...' : (stats.totalKidsSongs ?? '—')}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Music className="w-4 h-4" />
              <span className="text-sm font-medium">Total songs (all types)</span>
            </div>
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              {loading ? '...' : (stats.totalSongs ?? '—')}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Est. GPU cost (all-time)</span>
            </div>
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              ~${(((stats.totalKidsSongs ?? 0) * 0.005)).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">at $0.005/song</p>
          </div>
        </div>

        {/* Recent Kids Songs Table */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Recent kids song generations</h2>
          {recentKidsSongs.length === 0 && !loading ? (
            <p className="text-zinc-400 text-sm">No kids songs generated yet.</p>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/5">
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Child</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Song type</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 hidden sm:table-cell">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 hidden md:table-cell">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentKidsSongs.map((song: any, i) => (
                    <tr key={song.id} className={`border-b border-zinc-100 dark:border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-zinc-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{song.child_name || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{(song.song_type || '—').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                        {song.duration > 0 ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                        {song.created_at ? new Date(song.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {song.mp3_url ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
                            <Activity className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/30 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">Cost & Pricing Reference</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'GPU cost/song', value: '~$0.003–0.005' },
              { label: 'Ollama (Hermes)', value: 'Free (local)' },
              { label: 'Sell at (single)', value: '$1.99/song' },
              { label: 'Margin', value: '~99.7%' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-purple-400 dark:text-purple-500 font-medium mb-1">{label}</p>
                <p className="text-purple-900 dark:text-purple-200 font-bold text-lg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
