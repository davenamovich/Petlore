'use client';

import { useState, useRef, useEffect } from 'react';
import {
  PET_TYPES,
  PERSONALITIES,
  MUSIC_GENRES,
  VISUAL_STYLES,
  SERIES_TEMPLATES,
  VIRAL_HOOKS,
  FUNNIEST_COMBOS,
} from '@/lib/chaos-data';
import { ChaosPlayer, UpsellModal } from '@/components/chaos/ChaosPlayer';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type AppView = 'landing' | 'studio' | 'lore' | 'gallery';

type StudioStage = 'select' | 'customize' | 'generating' | 'result';

type ChaosConfig = {
  petType: string;
  petName: string;
  personality: string;
  customPersonality: string;
  musicGenre: string;
  customGenre: string;
  visualStyle: string;
  customVisual: string;
  seriesType: string;
  hookType: string;
};

const DEFAULT_CONFIG: ChaosConfig = {
  petType: '',
  petName: '',
  personality: '',
  customPersonality: '',
  musicGenre: '',
  customGenre: '',
  visualStyle: '',
  customVisual: '',
  seriesType: '',
  hookType: '8sec',
};

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function ChaosEngine() {
  const [view, setView] = useState<AppView>('landing');
  const [config, setConfig] = useState<ChaosConfig>(DEFAULT_CONFIG);
  const [studioStage, setStudioStage] = useState<StudioStage>('select');
  const [lyrics, setLyrics] = useState('');
  const [lore, setLore] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songId, setSongId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loreBusy, setLoreBusy] = useState(false);
  const [loreError, setLoreError] = useState('');
  const [showUpsell, setShowUpsell] = useState(false);

  // ─── SUGGEST BEST COMBO ────────────────────────────────────────────────
  const getSuggestedCombo = (petTypeId: string) => {
    const hook = VIRAL_HOOKS.find(h => h.pet === petTypeId);
    if (hook) {
      return { personality: hook.personality, genre: hook.genre };
    }
    const pet = PET_TYPES.find(p => p.id === petTypeId);
    return { personality: pet?.defaultPersonality || '', genre: pet?.defaultGenre || '' };
  };

  // ─── GENERATE SONG ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!config.petType || !config.personality || !config.musicGenre || !config.visualStyle) {
      setError('Fill in all the chaos parameters first!');
      return;
    }

    setBusy(true);
    setError('');
    setStudioStage('generating');

    try {
      const res = await fetch('/api/chaos/generate?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petType: config.petType,
          petName: config.petName || undefined,
          personality: config.personality,
          musicGenre: config.musicGenre,
          visualStyle: config.visualStyle,
          seriesType: config.seriesType || undefined,
          customPersonality: config.customPersonality || undefined,
          customGenre: config.customGenre || undefined,
          customVisual: config.customVisual || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setLyrics(data.lyrics);
      setSongTitle(data.title);
      setSongId(data.id);
      setStudioStage('result');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStudioStage('customize');
    } finally {
      setBusy(false);
    }
  };

  // ─── GENERATE LORE ─────────────────────────────────────────────────────
  const handleGenerateLore = async () => {
    if (!config.petType || !config.personality) {
      setLoreError('Select a pet and personality first!');
      return;
    }

    setLoreBusy(true);
    setLoreError('');

    try {
      const res = await fetch('/api/chaos/lore?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petType: config.petType,
          petName: config.petName || undefined,
          personality: config.personality,
          seriesType: config.seriesType || undefined,
          customPersonality: config.customPersonality || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Lore generation failed');
      }

      const data = await res.json();
      setLore(data.lore);
    } catch (err: unknown) {
      setLoreError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoreBusy(false);
    }
  };

  // ─── QUICK GENERATE FROM HOOK ──────────────────────────────────────────
  const quickGenerate = async (hook: typeof VIRAL_HOOKS[0]) => {
    setConfig({
      ...DEFAULT_CONFIG,
      petType: hook.pet,
      personality: hook.personality,
      musicGenre: hook.genre,
      visualStyle: PET_TYPES.find(p => p.id === hook.pet)?.defaultVisual || 'gta_cinematic',
    });
    setView('studio');
    setStudioStage('customize');
  };

  // ─── START OVER ────────────────────────────────────────────────────────
  const startOver = () => {
    setConfig(DEFAULT_CONFIG);
    setLyrics('');
    setLore('');
    setSongTitle('');
    setSongId('');
    setError('');
    setLoreError('');
    setStudioStage('select');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {view === 'landing' && (
        <LandingPage
          onEnterStudio={() => { setView('studio'); setStudioStage('select'); }}
          onQuickGenerate={quickGenerate}
          onViewLore={() => { setView('lore'); }}
          onViewGallery={() => { setView('gallery'); }}
        />
      )}
      {view === 'studio' && (
        <ChaosStudio
          config={config}
          setConfig={setConfig}
          stage={studioStage}
          setStage={setStudioStage}
          lyrics={lyrics}
          songTitle={songTitle}
          songId={songId}
          busy={busy}
          error={error}
          onGenerate={handleGenerate}
          onStartOver={startOver}
          onBack={() => { setView('landing'); startOver(); }}
          getSuggestedCombo={getSuggestedCombo}
        />
      )}
      {view === 'lore' && (
        <LoreGenerator
          config={config}
          setConfig={setConfig}
          lore={lore}
          setLore={setLore}
          busy={loreBusy}
          error={loreError}
          onGenerate={handleGenerateLore}
          onBack={() => setView('landing')}
          onMakeSong={() => { setView('studio'); setStudioStage('customize'); }}
        />
      )}
      {view === 'gallery' && (
        <Gallery onBack={() => setView('landing')} />
      )}

      {/* Upsell Modal */}
      <UpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        songTitle={songTitle}
        petType={config.petType}
        genreId={config.musicGenre}
      />
    </div>
  );
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────

function LandingPage({
  onEnterStudio,
  onQuickGenerate,
  onViewLore,
  onViewGallery,
}: {
  onEnterStudio: () => void;
  onQuickGenerate: (hook: typeof VIRAL_HOOKS[0]) => void;
  onViewLore: () => void;
  onViewGallery: () => void;
}) {
  const [hoveredHook, setHoveredHook] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center text-xl font-black shadow-lg shadow-red-500/30">
              CE
            </div>
            <div>
              <div className="text-sm font-black tracking-wider">THE CHAOS ENGINE</div>
              <div className="text-[10px] text-zinc-500 tracking-widest uppercase">Infinite AI Meme Songs</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onViewLore} className="text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Pet Lore
            </button>
            <button onClick={onViewGallery} className="text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Gallery
            </button>
            <button
              onClick={onEnterStudio}
              className="text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all"
            >
              Create Chaos
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="animate-pulse">🔥</span> Dead serious production. Completely stupid concept.
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6 leading-[0.9]">
            YOUR PET.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              MAIN CHARACTER
            </span>
            <br />
            ENERGY.
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            AI meme songs so unhinged they go viral. Pick a pet. Pick a ridiculous personality.
            Pick a genre that makes NO sense. Then commit 100%.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={onEnterStudio}
              className="group text-lg font-black bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all flex items-center gap-2"
            >
              Start the Chaos
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
            <button
              onClick={onViewLore}
              className="text-lg font-bold text-zinc-300 px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              Generate Pet Lore
            </button>
          </div>

          <p className="text-sm text-zinc-500">8-20 second viral hooks. Then upsell the full version.</p>
        </div>
      </section>

      {/* THE FORMULA */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-500 font-bold mb-3">The Formula</div>
            <h2 className="text-4xl md:text-5xl font-black">4 ingredients. Infinite chaos.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', label: 'Pet Type', desc: 'Chihuahua? Frog? Goldfish? Pick your fighter.', emoji: '🐕', color: 'from-amber-500 to-orange-600' },
              { step: '02', label: 'Ridiculous Personality', desc: 'Drill rapper. Conspiracy theorist. Goth.', emoji: '🔥', color: 'from-red-500 to-pink-600' },
              { step: '03', label: 'Wrong Genre', desc: 'Opera chihuahua. Death metal bunny. Phonk turtle.', emoji: '🎵', color: 'from-purple-500 to-violet-600' },
              { step: '04', label: 'Overdramatic Visuals', desc: 'GTA cinematics. Rave. Underwater casino.', emoji: '🎬', color: 'from-pink-500 to-rose-600' },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                    {item.emoji}
                  </div>
                  <div className="text-xs font-mono text-orange-400 mb-1">{item.step}</div>
                  <h3 className="text-lg font-bold mb-2">{item.label}</h3>
                  <p className="text-sm text-zinc-400">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 text-zinc-700 text-xl">→</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-block bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl px-6 py-3">
              <p className="text-lg font-black text-white">Then COMMIT 100%.</p>
              <p className="text-sm text-zinc-400">That contrast is what makes people share it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VIRAL HOOKS SHOWCASE */}
      <section className="py-20 px-4 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold mb-3">Viral Silly Song Ideas</div>
            <h2 className="text-4xl md:text-5xl font-black">10 proven viral hooks</h2>
            <p className="text-zinc-400 mt-3">Click any to generate it instantly</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIRAL_HOOKS.map((hook, i) => {
              const pet = PET_TYPES.find(p => p.id === hook.pet);
              const genre = MUSIC_GENRES.find(g => g.id === hook.genre);
              return (
                <button
                  key={i}
                  onClick={() => onQuickGenerate(hook)}
                  onMouseEnter={() => setHoveredHook(i)}
                  onMouseLeave={() => setHoveredHook(null)}
                  className="text-left bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-orange-500/40 hover:bg-zinc-900 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pet?.color || 'from-zinc-600 to-zinc-700'} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                      {pet?.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-white">{hook.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{genre?.label}</span>
                      </div>
                      <p className="text-sm text-zinc-400 italic mb-2">&ldquo;{hook.hook}&rdquo;</p>
                      <div className="text-xs text-zinc-500">{pet?.label} &middot; {genre?.emoji} {genre?.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FUNNIEST COMBOS */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-pink-500 font-bold mb-3">Audio Style Combinations</div>
            <h2 className="text-4xl md:text-5xl font-black">Unexpected = Funny</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {FUNNIEST_COMBOS.map((combo, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-white/5 rounded-full px-5 py-2.5 text-sm font-medium hover:border-pink-500/40 hover:bg-pink-500/5 transition-all cursor-default"
              >
                <span className="text-zinc-300">{combo.pet}</span>
                <span className="text-zinc-600 mx-2">×</span>
                <span className="text-pink-400">{combo.genre}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERIES TEMPLATES */}
      <section className="py-20 px-4 bg-zinc-950/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-500 font-bold mb-3">Insane Viral Series Ideas</div>
            <h2 className="text-4xl md:text-5xl font-black">Series that never end</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERIES_TEMPLATES.map((series, i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{series.emoji}</span>
                  <h3 className="text-xl font-black">{series.label}</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">{series.description}</p>
                <div className="space-y-2">
                  {series.examples.map((ex, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-zinc-300">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE REAL PRODUCT */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold mb-3">The Real Product</div>
          <h2 className="text-4xl md:text-6xl font-black mb-6">Infinite AI Meme Songs</h2>
          <p className="text-xl text-zinc-400 mb-12">Pet-focused first. Then the world.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {['Babies', 'Coworkers', 'Gamers', 'Gym Bros', 'Crypto Traders', 'DoorDashers', 'Boomers', 'Your Ex'].map((cat, i) => (
              <div key={i} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                {cat}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-8">
            <p className="text-2xl font-black mb-3">THE MOST IMPORTANT RULE</p>
            <p className="text-lg text-zinc-300 mb-4">The videos must act like this pet is the main character of a billion-dollar movie franchise.</p>
            <p className="text-zinc-400">That contrast is what makes people share it.<br /><strong className="text-white">Dead serious production. Completely stupid concept.</strong></p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6">
            Ready to
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent"> commit?</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10">Pick a pet. Pick chaos. The internet isn&apos;t ready.</p>
          <button
            onClick={onEnterStudio}
            className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-5 rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all"
          >
            Start the Chaos Engine
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-[10px] font-black">CE</div>
            <span className="font-semibold text-zinc-300">THE CHAOS ENGINE</span>
          </div>
          <p>Infinite AI meme songs. Dead serious production. Completely stupid concept.</p>
        </div>
      </footer>
    </div>
  );
}

// ─── CHAOS STUDIO ────────────────────────────────────────────────────────────

function ChaosStudio({
  config,
  setConfig,
  stage,
  setStage,
  lyrics,
  songTitle,
  songId,
  busy,
  error,
  onGenerate,
  onStartOver,
  onBack,
  getSuggestedCombo,
}: {
  config: ChaosConfig;
  setConfig: (c: ChaosConfig) => void;
  stage: StudioStage;
  setStage: (s: StudioStage) => void;
  lyrics: string;
  songTitle: string;
  songId: string;
  busy: boolean;
  error: string;
  onGenerate: () => void;
  onStartOver: () => void;
  onBack: () => void;
  getSuggestedCombo: (petType: string) => { personality: string; genre: string };
}) {
  const updateConfig = (key: keyof ChaosConfig, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const selectedPet = PET_TYPES.find(p => p.id === config.petType);
  const selectedPersonality = PERSONALITIES.find(p => p.id === config.personality);
  const selectedGenre = MUSIC_GENRES.find(g => g.id === config.musicGenre);
  const selectedVisual = VISUAL_STYLES.find(v => v.id === config.visualStyle);

  return (
    <div className="min-h-screen bg-black">
      {/* Studio Nav */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xs font-black">CE</div>
            <span className="text-sm font-bold">CHAOS STUDIO</span>
          </div>

          {/* Stage indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            {['SELECT', 'CUSTOMIZE', 'GENERATE', 'RESULT'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={i <= ['select', 'customize', 'generating', 'result'].indexOf(stage) ? 'text-orange-400' : 'text-zinc-600'}>
                  {s}
                </span>
                {i < 3 && <span className="text-zinc-700">→</span>}
              </div>
            ))}
          </div>

          <button
            onClick={onStartOver}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Start Over
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* ─── STAGE: SELECT PET ─── */}
        {stage === 'select' && (
          <div>
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-orange-500 font-bold mb-2">Step 01</div>
              <h2 className="text-3xl font-black mb-2">Pick your fighter.</h2>
              <p className="text-zinc-400">Choose the pet that will become the main character.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
              {PET_TYPES.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => {
                    const combo = getSuggestedCombo(pet.id);
                    setConfig({
                      ...config,
                      petType: pet.id,
                      personality: combo.personality,
                      musicGenre: combo.genre,
                      visualStyle: pet.defaultVisual,
                    });
                  }}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    config.petType === pet.id
                      ? 'border-orange-500/60 bg-orange-500/5'
                      : 'border-white/5 bg-zinc-950 hover:border-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pet.color} flex items-center justify-center text-xl mb-3 shadow-lg`}>
                    {pet.emoji}
                  </div>
                  <div className="font-bold text-sm mb-1">{pet.label}</div>
                  <div className="text-xs text-zinc-500 leading-snug">{pet.description}</div>
                </button>
              ))}
            </div>

            {config.petType && (
              <button
                onClick={() => setStage('customize')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all"
              >
                Customize {selectedPet?.label || 'Pet'} →
              </button>
            )}
          </div>
        )}

        {/* ─── STAGE: CUSTOMIZE ─── */}
        {stage === 'customize' && (
          <div>
            {/* Pet Name */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedPet?.color} flex items-center justify-center text-xl shadow-lg`}>
                  {selectedPet?.emoji}
                </div>
                <div>
                  <div className="font-bold">{selectedPet?.label}</div>
                  <div className="text-xs text-zinc-500">{selectedPet?.description}</div>
                </div>
              </div>
              <div className="max-w-md">
                <label className="text-xs text-zinc-500 mb-1 block">Pet Name (optional)</label>
                <input
                  type="text"
                  value={config.petName}
                  onChange={e => updateConfig('petName', e.target.value)}
                  placeholder="Name your pet..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Personality */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-orange-500 font-bold mb-2">Personality</div>
              <h3 className="text-xl font-bold mb-4">Pick their ridiculous personality</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PERSONALITIES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => updateConfig('personality', p.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      config.personality === p.id
                        ? 'border-orange-500/60 bg-orange-500/5'
                        : 'border-white/5 bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{p.emoji}</span>
                      <span className="font-bold text-sm">{p.label}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{p.description}</div>
                  </button>
                ))}
              </div>
              {config.personality === 'custom' && (
                <input
                  type="text"
                  value={config.customPersonality}
                  onChange={e => updateConfig('customPersonality', e.target.value)}
                  placeholder="Describe your custom personality..."
                  className="mt-3 w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            {/* Genre */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-red-500 font-bold mb-2">Music Genre</div>
              <h3 className="text-xl font-bold mb-2">Pick the WRONG genre</h3>
              <p className="text-sm text-zinc-500 mb-4">Unexpected = funny. Pick the one that makes NO sense.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {MUSIC_GENRES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => updateConfig('musicGenre', g.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      config.musicGenre === g.id
                        ? 'border-red-500/60 bg-red-500/5'
                        : 'border-white/5 bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{g.emoji}</span>
                      <span className="font-bold text-sm">{g.label}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{g.bpm} BPM</span>
                    </div>
                    <div className="text-xs text-zinc-500">{g.description}</div>
                  </button>
                ))}
              </div>
              {config.musicGenre === 'custom' && (
                <input
                  type="text"
                  value={config.customGenre}
                  onChange={e => updateConfig('customGenre', e.target.value)}
                  placeholder="Describe your custom genre..."
                  className="mt-3 w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            {/* Visual Style */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-pink-500 font-bold mb-2">Visuals</div>
              <h3 className="text-xl font-bold mb-4">Overdramatic visual style</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {VISUAL_STYLES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => updateConfig('visualStyle', v.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      config.visualStyle === v.id
                        ? 'border-pink-500/60 bg-pink-500/5'
                        : 'border-white/5 bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{v.emoji}</span>
                      <span className="font-bold text-sm">{v.label}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{v.description}</div>
                  </button>
                ))}
              </div>
              {config.visualStyle === 'custom' && (
                <input
                  type="text"
                  value={config.customVisual}
                  onChange={e => updateConfig('customVisual', e.target.value)}
                  placeholder="Describe your custom visual style..."
                  className="mt-3 w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            {/* Series (Optional) */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">Series (Optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ id: '', label: 'None', emoji: '❌', description: 'Standalone song' }, ...SERIES_TEMPLATES].map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateConfig('seriesType', s.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      config.seriesType === s.id
                        ? 'border-white/20 bg-white/5'
                        : 'border-white/5 bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{s.emoji}</span>
                      <span className="font-bold text-sm">{s.label}</span>
                    </div>
                    {'description' in s && <div className="text-xs text-zinc-500">{s.description}</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Hook Length */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">Format</div>
              <div className="flex gap-3">
                {[
                  { id: '8sec', label: '8 sec Hook', desc: 'Maximum virality' },
                  { id: '15sec', label: '15 sec Hook', desc: 'TikTok sweet spot' },
                  { id: '20sec', label: '20 sec Hook', desc: 'Full intro hook' },
                ].map(h => (
                  <button
                    key={h.id}
                    onClick={() => updateConfig('hookType', h.id)}
                    className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                      config.hookType === h.id
                        ? 'border-orange-500/60 bg-orange-500/5'
                        : 'border-white/5 bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="font-bold text-sm">{h.label}</div>
                    <div className="text-xs text-zinc-500">{h.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={onGenerate}
              disabled={busy || !config.petType || !config.personality || !config.musicGenre || !config.visualStyle}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 transition-all text-lg"
            >
              {busy ? 'Generating Chaos...' : 'COMMIT 100% →'}
            </button>

            <div className="flex items-center justify-center gap-3 mt-4 text-xs text-zinc-500">
              <span>{selectedPet?.emoji} {selectedPet?.label}</span>
              <span>×</span>
              <span>{selectedPersonality?.emoji} {selectedPersonality?.label}</span>
              <span>×</span>
              <span>{selectedGenre?.emoji} {selectedGenre?.label}</span>
              <span>×</span>
              <span>{selectedVisual?.emoji} {selectedVisual?.label}</span>
            </div>
          </div>
        )}

        {/* ─── STAGE: GENERATING ─── */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500 animate-spin opacity-20" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 rounded-full bg-black flex items-center justify-center">
                <span className="text-4xl animate-bounce" style={{ animationDuration: '0.5s' }}>
                  {selectedPet?.emoji || '🎵'}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-black mb-2">Committing 100%...</h2>
            <p className="text-zinc-400 mb-6">The Chaos Engine is creating something unhinged.</p>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <span>{selectedPet?.emoji} {selectedPet?.label}</span>
              <span>×</span>
              <span>{selectedPersonality?.emoji} {selectedPersonality?.label}</span>
              <span>×</span>
              <span>{selectedGenre?.emoji} {selectedGenre?.label}</span>
            </div>
          </div>
        )}

        {/* ─── STAGE: RESULT ─── */}
        {stage === 'result' && lyrics && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs font-mono text-orange-400 uppercase tracking-wider">Chaos Engine Output</div>
              <button
                onClick={onStartOver}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                New Song →
              </button>
            </div>

            {/* Audio Player with built-in upsell */}
            <ChaosPlayer
              genreId={config.musicGenre}
              lyrics={lyrics}
              songTitle={songTitle}
              petType={config.petType}
              personality={config.personality}
              onUpsell={() => setShowUpsell(true)}
            />

            {/* Generate Another button */}
            <button
              onClick={onStartOver}
              className="w-full mt-4 bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-300 font-bold py-3 rounded-xl transition-all"
            >
              Generate Another Chaos Song
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LORE GENERATOR ─────────────────────────────────────────────────────────

function LoreGenerator({
  config,
  setConfig,
  lore,
  setLore,
  busy,
  error,
  onGenerate,
  onBack,
  onMakeSong,
}: {
  config: ChaosConfig;
  setConfig: (c: ChaosConfig) => void;
  lore: string;
  setLore: (l: string) => void;
  busy: boolean;
  error: string;
  onGenerate: () => void;
  onBack: () => void;
  onMakeSong: () => void;
}) {
  const updateConfig = (key: keyof ChaosConfig, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="min-h-screen bg-black">
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold">PET LORE GENERATOR</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">📖</div>
          <h1 className="text-4xl font-black mb-3">AI Generated Pet Lore</h1>
          <p className="text-zinc-400 text-lg">The biggest winner. Fake backstories that hit harder than real ones.</p>
        </div>

        {/* Config */}
        <div className="space-y-6 mb-8">
          {/* Pet Type */}
          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Pet Type</label>
            <div className="flex flex-wrap gap-2">
              {PET_TYPES.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => updateConfig('petType', pet.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    config.petType === pet.id
                      ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                      : 'border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {pet.emoji} {pet.label}
                </button>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Personality</label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => updateConfig('personality', p.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    config.personality === p.id
                      ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                      : 'border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pet Name */}
          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Pet Name (optional)</label>
            <input
              type="text"
              value={config.petName}
              onChange={e => updateConfig('petName', e.target.value)}
              placeholder="Name your pet..."
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Series */}
          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Series (optional)</label>
            <div className="flex flex-wrap gap-2">
              {SERIES_TEMPLATES.map(s => (
                <button
                  key={s.id}
                  onClick={() => updateConfig('seriesType', config.seriesType === s.id ? '' : s.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    config.seriesType === s.id
                      ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                      : 'border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={busy || !config.petType || !config.personality}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-30 transition-all text-lg"
        >
          {busy ? 'Generating Lore...' : 'Generate Pet Lore'}
        </button>

        {/* Lore Result */}
        {lore && (
          <div className="mt-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-2xl p-8">
            <div className="text-xs font-mono text-orange-400 mb-4">PET LORE</div>
            <div className="text-lg text-zinc-200 leading-relaxed mb-6 italic">
              &ldquo;{lore}&rdquo;
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(lore)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-6 py-2 rounded-xl transition-all text-sm"
              >
                Copy Lore
              </button>
              <button
                onClick={onMakeSong}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-orange-500/30 transition-all text-sm"
              >
                Turn Into Song →
              </button>
            </div>
          </div>
        )}

        {/* Example Lore */}
        <div className="mt-12">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-4">Example Lore</div>
          <div className="space-y-4">
            {[
              { pet: '🦝 Raccoon', lore: 'Divorced three times. Lost custody of the trash cans. Now operates a underground ring of dumpster-based cryptocurrency trading from behind a Waffle House in Tampa.' },
              { pet: '🐕 Bulldog', lore: 'Retired war veteran. Served 8 tours in the Great Squirrel Conflict. Now spends his days staring out windows and occasionally saluting the mailman. His therapist says he\'s making progress.' },
              { pet: '🦜 Parrot', lore: 'Made $4.2 million in crypto, lost it all in a rug pull called $SEED. Now gives financial advice on TikTok to 2.3 million followers. None of it is good.' },
              { pet: '🐴 Horse', lore: 'Emotionally unavailable since 2019. Ghosted three mares on Hinge. Works remotely as a life coach. The irony is not lost on anyone.' },
            ].map((ex, i) => (
              <div key={i} className="bg-zinc-950 border border-white/5 rounded-xl p-4">
                <div className="font-bold text-sm mb-2">{ex.pet}</div>
                <p className="text-sm text-zinc-400 italic">&ldquo;{ex.lore}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────

function Gallery({ onBack }: { onBack: () => void }) {
  const [songs, setSongs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chaos/songs?XTransformPort=3000')
      .then(r => r.json())
      .then(data => setSongs(data.songs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold">CHAOS GALLERY</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3">The Hall of Chaos</h1>
          <p className="text-zinc-400">Every pet. Every genre. Maximum main character energy.</p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20">Loading chaos...</div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold mb-2">No chaos yet</h2>
            <p className="text-zinc-400">Be the first to create a viral pet meme song!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map((song: any) => {
              const pet = PET_TYPES.find(p => p.id === song.petType);
              const genre = MUSIC_GENRES.find(g => g.id === song.musicGenre);
              const personality = PERSONALITIES.find(p => p.id === song.personality);
              return (
                <div key={song.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pet?.color || 'from-zinc-700 to-zinc-800'} flex items-center justify-center text-xl`}>
                      {pet?.emoji || '🎵'}
                    </div>
                    <div>
                      <div className="font-bold">{song.songTitle || 'Untitled'}</div>
                      <div className="text-xs text-zinc-500">
                        {pet?.label} &middot; {personality?.label} &middot; {genre?.label}
                      </div>
                    </div>
                  </div>
                  <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                    {song.lyrics?.substring(0, 300)}...
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
