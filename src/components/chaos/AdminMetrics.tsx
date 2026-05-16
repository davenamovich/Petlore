'use client';

import { useState, useEffect } from 'react';

type Song = {
  id: string;
  title: string;
  petType: string;
  personality: string;
  musicGenre: string;
  createdAt: string;
  isPublic: boolean;
  audioUrl?: string;
  status?: string;
};

type AdminTab = 'metrics' | 'songs' | 'produce' | 'referrals' | 'system';

type BackendHealth = {
  available: boolean;
  latencyMs?: number;
  error?: string;
  detail?: string;
  url?: string;
  endpointId?: string | null;
};

type HealthData = {
  activeBackend: 'runpod' | 'acestep' | 'none';
  backends: {
    aceStep: BackendHealth;
    runPod: BackendHealth;
  };
  env: {
    audioDir: string;
    audioBaseUrl: string;
  };
};

// Safe JSON parse — handles empty body / HTML error pages
async function safeJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return { error: `Non-JSON response (${res.status}): ${text.slice(0, 120)}` }; }
}

export function AdminMetrics({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<AdminTab>('metrics');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [producingId, setProducingId] = useState<string | null>(null);
  const [pollTimer, setPollTimer] = useState<NodeJS.Timeout | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    fetchSongs();
    return () => { if (pollTimer) clearInterval(pollTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-check health when user opens the System tab
  useEffect(() => {
    if (tab === 'system' && !health && !healthLoading) {
      checkHealth();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/chaos/health');
      const data = await safeJson(res);
      if (res.ok) setHealth(data);
      else setHealth(null);
    } catch { setHealth(null); }
    finally { setHealthLoading(false); }
  }

  async function fetchSongs() {
    setLoading(true);
    try {
      const res = await fetch('/api/chaos/admin/songs?XTransformPort=3000');
      const data = await safeJson(res);
      if (res.ok) setSongs(data.songs || []);
      else console.error('[admin] GET songs:', data.error);
    } catch (e) { console.error('[admin] fetchSongs:', e); }
    finally { setLoading(false); }
  }

  async function handleProduce(id: string) {
    setProducingId(id);
    setActionMsg('🟡 Queued for production...');
    try {
      const res = await fetch('/api/chaos/admin/songs?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'produce', songId: id }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setActionMsg(`❌ ${data.error || res.statusText}`);
        setProducingId(null);
        return;
      }
      if (data.status === 'generating') {
        setActionMsg('⚙️ Generating — polling status...');
        const timer = setInterval(async () => {
          const poll = await fetch('/api/chaos/admin/songs?XTransformPort=3000', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', songId: id }),
          });
          const pData = await safeJson(poll);
          if (pData.status === 'done' || pData.audioUrl) {
            clearInterval(timer);
            setProducingId(null);
            setActionMsg('✅ Production complete!');
            fetchSongs();
          } else if (pData.status === 'failed') {
            clearInterval(timer);
            setProducingId(null);
            setActionMsg('❌ Production failed.');
          }
        }, 5000);
        setPollTimer(timer);
      } else {
        setActionMsg(data.error ? `❌ ${data.error}` : '✅ Done');
        setProducingId(null);
        fetchSongs();
      }
    } catch (e: unknown) {
      setActionMsg(`❌ ${e instanceof Error ? e.message : 'Error'}`);
      setProducingId(null);
    }
  }

  async function handleTogglePublic(song: Song) {
    try {
      const res = await fetch('/api/chaos/admin/songs?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'togglePublic', songId: song.id, isPublic: !song.isPublic }),
      });
      if (res.ok) fetchSongs();
      else { const d = await safeJson(res); setActionMsg(`❌ ${d.error || 'Toggle failed'}`); }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this song permanently?')) return;
    try {
      const res = await fetch('/api/chaos/admin/songs?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', songId: id }),
      });
      if (res.ok) fetchSongs();
      else { const d = await safeJson(res); setActionMsg(`❌ ${d.error || 'Delete failed'}`); }
    } catch { /* ignore */ }
  }

  // ── Computed metrics ─────────────────────────────────────────────────────────
  const total = songs.length;
  const published = songs.filter(s => s.isPublic).length;
  const withAudio = songs.filter(s => s.audioUrl).length;
  const convRate = total > 0 ? ((withAudio / total) * 100).toFixed(0) : '0';

  const byGenre = songs.reduce<Record<string, number>>((acc, s) => {
    acc[s.musicGenre] = (acc[s.musicGenre] || 0) + 1; return acc;
  }, {});
  const topGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byPet = songs.reduce<Record<string, number>>((acc, s) => {
    acc[s.petType] = (acc[s.petType] || 0) + 1; return acc;
  }, {});
  const topPets = Object.entries(byPet).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'metrics', label: '📊 Metrics' },
    { id: 'songs', label: '🎵 All Songs' },
    { id: 'produce', label: '⚙️ Production' },
    { id: 'referrals', label: '🤝 Referral Stats' },
    { id: 'system', label: '🔧 System' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm">🛡️</div>
            <div>
              <div className="text-sm font-black">ADMIN PORTAL</div>
              <div className="text-[10px] text-zinc-500 font-mono">PetLore Operations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500 font-mono">{total} songs total</span>
          </div>
        </div>
      </nav>

      {/* STATUS BAR */}
      {actionMsg && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-orange-300">{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* TABS */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── METRICS ── */}
        {tab === 'metrics' && (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Songs', value: total, sub: 'all time', icon: '🎵', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'from-blue-500/10 to-blue-600/10' },
                { label: 'Published', value: published, sub: `${total > 0 ? ((published / total) * 100).toFixed(0) : 0}% of total`, icon: '🌐', color: 'text-green-400', border: 'border-green-500/20', bg: 'from-green-500/10 to-green-600/10' },
                { label: 'With Audio', value: withAudio, sub: `${convRate}% production rate`, icon: '🎧', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/10 to-purple-600/10' },
                { label: 'Private', value: total - published, sub: 'not yet published', icon: '🔒', color: 'text-zinc-400', border: 'border-zinc-500/20', bg: 'from-zinc-500/10 to-zinc-600/10' },
              ].map(card => (
                <div key={card.label} className={`bg-gradient-to-br ${card.bg} border ${card.border} rounded-2xl p-5`}>
                  <div className="text-xl mb-2">{card.icon}</div>
                  <div className={`text-3xl font-black ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">{card.label}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Breakdown charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Top Genres</h3>
                {topGenres.length === 0 ? (
                  <p className="text-zinc-600 text-sm">No data yet</p>
                ) : topGenres.map(([genre, count]) => (
                  <div key={genre} className="flex items-center gap-3 mb-2.5">
                    <div className="text-xs text-zinc-400 w-24 truncate">{genre}</div>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-500 w-6 text-right font-mono">{count}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Top Pet Types</h3>
                {topPets.length === 0 ? (
                  <p className="text-zinc-600 text-sm">No data yet</p>
                ) : topPets.map(([pet, count]) => (
                  <div key={pet} className="flex items-center gap-3 mb-2.5">
                    <div className="text-xs text-zinc-400 w-24 truncate">{pet}</div>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-500 w-6 text-right font-mono">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue / monetization section */}
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><span>💰</span> Revenue & Monetization</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'ZenMux Referral Potential', value: '$50', sub: '10 referrals × $5 each', icon: '🤝' },
                  { label: 'Scene Builder Access', value: '&gt; $0', sub: 'positive balance to unlock', icon: '🔐' },
                  { label: 'Invite Link', value: '4E9SOE', sub: 'zenmux.ai/invite/4E9SOE', icon: '🔗' },
                ].map(item => (
                  <div key={item.label} className="bg-black/30 rounded-xl p-4">
                    <div className="text-xl mb-2">{item.icon}</div>
                    <div className="text-2xl font-black text-yellow-400">{item.value}</div>
                    <div className="text-xs text-zinc-400 mt-1">{item.label}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALL SONGS ── */}
        {tab === 'songs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">{total} Songs</h2>
              <button onClick={fetchSongs} className="text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all">
                ↻ Refresh
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
            ) : songs.map(song => (
              <div key={song.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-xl flex-shrink-0">🎵</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{song.title}</div>
                  <div className="text-[11px] text-zinc-500">{song.petType} · {song.musicGenre} · {new Date(song.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${song.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                    {song.isPublic ? 'public' : 'private'}
                  </span>
                  {song.audioUrl && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">🎧 audio</span>}
                  <button onClick={() => handleTogglePublic(song)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg transition-all">
                    {song.isPublic ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(song.id)}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-all">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PRODUCTION ── */}
        {tab === 'produce' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-5 mb-2">
              <h3 className="text-sm font-black text-white mb-1">⚙️ Production Queue</h3>
              <p className="text-xs text-zinc-400">Songs without audio files. Generate real MP3s via ACE-Step / RunPod.</p>
            </div>
            {songs.filter(s => !s.audioUrl).length === 0 ? (
              <div className="text-center py-12 text-zinc-600">All songs have been produced! ✅</div>
            ) : songs.filter(s => !s.audioUrl).map(song => (
              <div key={song.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{song.title}</div>
                  <div className="text-[11px] text-zinc-500">{song.petType} · {song.musicGenre} · {new Date(song.createdAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => handleProduce(song.id)}
                  disabled={producingId === song.id}
                  className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                >
                  {producingId === song.id ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating</>
                  ) : '⚡ Produce'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── REFERRALS ── */}
        {tab === 'referrals' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Your Invite Code', value: '4E9SOE', sub: 'zenmux.ai/invite/4E9SOE', icon: '🔗', color: 'text-blue-400' },
                { label: 'Max Earnings', value: '$50', sub: '10 referrals × $5', icon: '💰', color: 'text-yellow-400' },
                { label: 'Friend Bonus', value: '+25%', sub: 'on first top-up', icon: '🎁', color: 'text-green-400' },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className={`text-3xl font-black ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-zinc-400 mt-1">{item.label}</div>
                  <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">10-Spot Progress</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="w-12 h-12 rounded-xl border-2 border-dashed border-green-500/20 flex items-center justify-center text-xs text-zinc-600 font-mono">
                    #{i + 1}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600">
                Track actual referral completions at{' '}
                <a href="https://zenmux.ai/platform" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a>
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Gate Configuration</h3>
              <div className="space-y-3">
                {[
                  { key: 'Invite URL', value: 'https://zenmux.ai/invite/4E9SOE' },
                  { key: 'Min Credit Required', value: '> $0.00 PAYG balance' },
                  { key: 'Key Storage', value: 'AES-256-GCM encrypted, localStorage only' },
                  { key: 'Verify Endpoint', value: '/api/chaos/auth/verify' },
                ].map(row => (
                  <div key={row.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs text-zinc-500 font-mono">{row.key}</span>
                    <span className="text-xs text-zinc-300 font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab === 'system' && (
          <div className="space-y-4">
            {/* Live health check */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Music Generation Status</h3>
                <button
                  onClick={checkHealth}
                  disabled={healthLoading}
                  className="text-xs bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-50 text-orange-300 px-3 py-1.5 rounded-lg transition-all font-mono"
                >
                  {healthLoading ? '⏳ Checking...' : '⚡ Check Now'}
                </button>
              </div>

              {!health && !healthLoading && (
                <p className="text-xs text-zinc-600 italic">Click "Check Now" to test live connectivity.</p>
              )}

              {health && (
                <div className="space-y-3">
                  {/* Active backend banner */}
                  <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                    health.activeBackend === 'none'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <span className="text-lg">
                      {health.activeBackend === 'runpod' ? '☁️' : health.activeBackend === 'acestep' ? '💻' : '❌'}
                    </span>
                    <div>
                      <div className={`text-sm font-bold ${health.activeBackend === 'none' ? 'text-red-400' : 'text-green-400'}`}>
                        {health.activeBackend === 'runpod' && 'RunPod (cloud) — active'}
                        {health.activeBackend === 'acestep' && 'Local ACE-Step — active'}
                        {health.activeBackend === 'none' && 'No music backend available'}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {health.activeBackend === 'none'
                          ? 'Start ACE-Step locally or configure RunPod credentials'
                          : 'Ready to produce real MP3s'}
                      </div>
                    </div>
                  </div>

                  {/* ACE-Step row */}
                  <div className="flex items-start justify-between py-2 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${health.backends.aceStep.available ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-zinc-300 font-bold">Local ACE-Step</span>
                        {health.backends.aceStep.latencyMs !== undefined && health.backends.aceStep.available && (
                          <span className="text-[10px] text-zinc-600 font-mono">{health.backends.aceStep.latencyMs}ms</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{health.backends.aceStep.url}</div>
                      {health.backends.aceStep.error && (
                        <div className="text-[10px] text-red-400 mt-0.5">{health.backends.aceStep.error}</div>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                      health.backends.aceStep.available
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {health.backends.aceStep.detail}
                    </span>
                  </div>

                  {/* RunPod row */}
                  <div className="flex items-start justify-between py-2 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${health.backends.runPod.available ? 'bg-green-500' : 'bg-zinc-600'}`} />
                        <span className="text-xs text-zinc-300 font-bold">RunPod Serverless</span>
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                        {health.backends.runPod.endpointId || 'RUNPOD_ENDPOINT_ID not set'}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                      health.backends.runPod.available
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-500/10 text-zinc-500'
                    }`}>
                      {health.backends.runPod.available ? 'configured' : 'not configured'}
                    </span>
                  </div>

                  {/* Audio paths */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs text-zinc-300">Audio storage</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{health.env.audioDir}</div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{health.env.audioBaseUrl}/*</span>
                  </div>
                </div>
              )}
            </div>

            {/* Database */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Database</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Total songs</span><span className="text-white font-mono">{total}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">With audio</span><span className="text-white font-mono">{withAudio}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Production rate</span><span className="text-white font-mono">{convRate}%</span>
                </div>
              </div>
            </div>

            {/* ACE-Step quick-start instructions when not available */}
            {health && !health.backends.aceStep.available && !health.backends.runPod.available && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                <h3 className="text-xs font-black text-amber-400 mb-3">🚀 Start ACE-Step Locally</h3>
                <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono">
                  <div>git clone https://github.com/ace-step/ACE-Step</div>
                  <div>cd ACE-Step &amp;&amp; pip install -e .</div>
                  <div>python -m acestep.pipeline_api --server_port 8001</div>
                </div>
                <p className="text-[10px] text-zinc-600 mt-3">
                  Or add <span className="text-amber-400">RUNPOD_API_KEY</span> + <span className="text-amber-400">RUNPOD_ENDPOINT_ID</span> to .env for cloud generation.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={fetchSongs}
                className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-bold py-3 rounded-xl transition-all">
                ↻ Refresh Songs
              </button>
              <a href="/api/chaos/health" target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-sm font-bold py-3 rounded-xl transition-all text-center">
                📡 Health JSON
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
