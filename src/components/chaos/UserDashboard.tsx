'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pae_k';
const REFERRAL_KEY = 'pae_ref';
const APP_SALT = 'petlore-animation-engine-v1';

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function decryptKey(blob: string): Promise<string> {
  const buf = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const salt = buf.slice(0, 16), iv = buf.slice(16, 28), cipher = buf.slice(28);
  const key = await deriveKey(APP_SALT, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

type Song = {
  id: string;
  title: string;
  petType: string;
  createdAt: string;
  isPublic: boolean;
  audioUrl?: string;
};

type ZenBalance = { total: number; topup: number; bonus: number } | null;
type ZenSub = { plan: string; status: string; quota5h: number; quota7d: number } | null;

export function UserDashboard({ onBack }: { onBack: () => void }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [zenBalance, setZenBalance] = useState<ZenBalance>(null);
  const [zenSub, setZenSub] = useState<ZenSub>(null);
  const [zenLoading, setZenLoading] = useState(false);
  const [savedReferral, setSavedReferral] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'creations' | 'referrals'>('overview');

  useEffect(() => {
    fetchSongs();
    const ref = localStorage.getItem(REFERRAL_KEY);
    if (ref) setSavedReferral(ref);
    // Try to load ZenMux data
    const blob = localStorage.getItem(STORAGE_KEY);
    if (blob) {
      decryptKey(blob).then(fetchZenData).catch(() => {});
    }
  }, []);

  async function fetchSongs() {
    try {
      const res = await fetch('/api/chaos/admin/songs?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function fetchZenData(apiKey: string) {
    setZenLoading(true);
    try {
      const [balRes, subRes] = await Promise.all([
        fetch('https://zenmux.ai/api/v1/management/payg/balance', { headers: { Authorization: `Bearer ${apiKey}` } }),
        fetch('https://zenmux.ai/api/v1/management/subscription/detail', { headers: { Authorization: `Bearer ${apiKey}` } }),
      ]);
      if (balRes.ok) {
        const b = await balRes.json();
        setZenBalance({ total: b.total ?? b.data?.total ?? 0, topup: b.topup ?? 0, bonus: b.bonus ?? 0 });
      }
      if (subRes.ok) {
        const s = await subRes.json();
        const d = s.data ?? s;
        setZenSub({
          plan: d.plan_name ?? d.tier ?? 'PAYG',
          status: d.status ?? 'active',
          quota5h: d.quota_5h_usage_percentage ?? 0,
          quota7d: d.quota_7d_usage_percentage ?? 0,
        });
      }
    } catch { /* ignore */ }
    finally { setZenLoading(false); }
  }

  function copyReferral() {
    if (!savedReferral) return;
    navigator.clipboard.writeText(savedReferral);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  }

  const publicCount = songs.filter(s => s.isPublic).length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-black">
              U
            </div>
            <span className="text-sm font-bold">My Dashboard</span>
          </div>
          <div className="text-xs text-zinc-500 font-mono">PetLore Creator</div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* TABS */}
        <div className="flex gap-2 mb-8">
          {([['overview', '📊 Overview'], ['creations', '🎵 Creations'], ['referrals', '🤝 Referrals']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Creations', value: songs.length, icon: '🎵', color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/20', text: 'text-blue-400' },
                { label: 'Published', value: publicCount, icon: '🌐', color: 'from-green-500/20 to-green-600/20', border: 'border-green-500/20', text: 'text-green-400' },
                { label: 'Private', value: songs.length - publicCount, icon: '🔒', color: 'from-zinc-500/20 to-zinc-600/20', border: 'border-zinc-500/20', text: 'text-zinc-400' },
                { label: 'ZenMux Credit', value: zenBalance ? `$${zenBalance.total.toFixed(2)}` : '—', icon: '💳', color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/20', text: 'text-purple-400' },
              ].map(card => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-5`}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className={`text-2xl font-black ${card.text}`}>{card.value}</div>
                  <div className="text-xs text-zinc-500 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* ZenMux account panel */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-white flex items-center gap-2"><span>⚡</span> ZenMux Account</h3>
                {zenLoading && <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />}
              </div>
              {zenBalance || zenSub ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {zenBalance && (
                    <div className="space-y-3">
                      <div className="text-xs text-zinc-500 uppercase tracking-widest">PAYG Balance</div>
                      <div className="text-4xl font-black text-green-400">${zenBalance.total.toFixed(2)}</div>
                      <div className="flex gap-4 text-xs text-zinc-500">
                        <span>Top-up: <span className="text-white">${zenBalance.topup.toFixed(2)}</span></span>
                        <span>Bonus: <span className="text-green-400">${zenBalance.bonus.toFixed(2)}</span></span>
                      </div>
                    </div>
                  )}
                  {zenSub && (
                    <div className="space-y-3">
                      <div className="text-xs text-zinc-500 uppercase tracking-widest">Subscription</div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">{zenSub.plan}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${zenSub.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {zenSub.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>5h quota</span><span>{(zenSub.quota5h * 100).toFixed(1)}%</span></div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(zenSub.quota5h * 100, 100)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>7d quota</span><span>{(zenSub.quota7d * 100).toFixed(1)}%</span></div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(zenSub.quota7d * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-zinc-500 text-sm mb-3">Connect your ZenMux API key via the Animation Engine to see live account data.</p>
                  <button onClick={onBack} className="text-xs text-purple-400 hover:underline">Open Animation Engine →</button>
                </div>
              )}
            </div>

            {/* Recent creations mini */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white">Recent Creations</h3>
                <button onClick={() => setActiveTab('creations')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">View all →</button>
              </div>
              {songs.slice(0, 3).map(song => (
                <div key={song.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-sm">🎵</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{song.title}</div>
                    <div className="text-[11px] text-zinc-500">{new Date(song.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${song.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-500'}`}>
                    {song.isPublic ? 'public' : 'private'}
                  </span>
                </div>
              ))}
              {songs.length === 0 && !loading && (
                <p className="text-zinc-600 text-sm text-center py-4">No creations yet — head to the studio!</p>
              )}
            </div>
          </div>
        )}

        {/* ── CREATIONS ── */}
        {activeTab === 'creations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-white">{songs.length} Creations</h2>
              <div className="text-xs text-zinc-500">{publicCount} published · {songs.length - publicCount} private</div>
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : songs.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">No songs yet. Create your first in the studio!</div>
            ) : songs.map(song => (
              <div key={song.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-xl flex-shrink-0">🎵</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{song.title}</div>
                  <div className="text-xs text-zinc-500">{song.petType} · {new Date(song.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${song.isPublic ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
                    {song.isPublic ? '🌐 public' : '🔒 private'}
                  </span>
                  {song.audioUrl && (
                    <a href={song.audioUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full hover:bg-blue-500/30 transition-all">
                      ▶ Play
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REFERRALS ── */}
        {activeTab === 'referrals' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🤝</div>
                <div>
                  <h2 className="text-xl font-black text-white mb-1">Your Referral Program</h2>
                  <p className="text-zinc-400 text-sm">
                    Friends who sign up with your link get <span className="text-green-400 font-bold">+25% bonus</span> on first top-up.
                    You earn <span className="text-yellow-400 font-bold">$5</span> per referral — 10 spots available.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Your Referral Link</div>
                {savedReferral ? (
                  <div className="space-y-3">
                    <div className="bg-black/50 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-300 font-mono break-all">{savedReferral}</div>
                    <button onClick={copyReferral}
                      className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 text-sm font-bold py-2.5 rounded-xl transition-all">
                      {refCopied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm">
                    No referral link saved. Visit the <button onClick={onBack} className="text-purple-400 hover:underline">Animation Engine</button> → Refer Friends tab to add yours.
                  </div>
                )}
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">10-Spot Tracker</div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-green-500/20 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
                      #{i + 1}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-600">Track completed referrals at <a href="https://zenmux.ai/platform" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a></p>
              </div>
            </div>

            {savedReferral && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Share Message</div>
                <div className="bg-black/40 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed mb-3">
                  Hey! I&apos;ve been creating AI pet videos with PetLore. Sign up for ZenMux with my link and get 25% bonus credit on your first top-up: <span className="text-green-400 font-mono">{savedReferral}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Hey! I've been creating AI pet videos with PetLore. Sign up for ZenMux with my link and get 25% bonus credit on your first top-up: ${savedReferral}`);
                    setRefCopied(true); setTimeout(() => setRefCopied(false), 2000);
                  }}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all"
                >
                  {refCopied ? '✓ Copied!' : '📋 Copy message'}
                </button>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Don&apos;t have a ZenMux account yet?</div>
                <div className="text-xs text-zinc-400">Sign up + load any positive balance to unlock scene builder access</div>
              </div>
              <a href="https://zenmux.ai/invite/4E9SOE" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 bg-white text-black font-black text-xs px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-all">
                🚀 Sign up
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
