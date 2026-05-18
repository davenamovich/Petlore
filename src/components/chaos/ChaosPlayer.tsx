'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { playDemoHook, stopTTS, type DemoPlayState } from '@/lib/chaos-audio';
import { MUSIC_GENRES, PET_TYPES, PERSONALITIES } from '@/lib/chaos-data';

// ─── CHAOS PLAYER ───────────────────────────────────────────────────────────

type ChaosPlayerProps = {
  genreId: string;
  lyrics: string;
  songTitle: string;
  petType: string;
  personality: string;
  onUpsell?: () => void;
};

export function ChaosPlayer({
  genreId,
  lyrics,
  songTitle,
  petType,
  personality,
  onUpsell,
}: ChaosPlayerProps) {
  const [playState, setPlayState] = useState<DemoPlayState>('idle');
  const [progress, setProgress] = useState('');
  const [playProgress, setPlayProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [showUpsell, setShowUpsell] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const pet = PET_TYPES.find(p => p.id === petType);
  const genre = MUSIC_GENRES.find(g => g.id === genreId);
  const pers = PERSONALITIES.find(p => p.id === personality);

  const handlePlay = useCallback(async () => {
    if (playState === 'playing') {
      // Stop
      stopRef.current?.();
      stopRef.current = null;
      if (progressInterval.current) clearInterval(progressInterval.current);
      setPlayState('idle');
      setPlayProgress(0);
      return;
    }

    try {
      setPlayProgress(0);
      const result = await playDemoHook(
        genreId,
        lyrics,
        (state) => {
          setPlayState(state);
          if (state === 'done') {
            setHasPlayedOnce(true);
            if (progressInterval.current) clearInterval(progressInterval.current);
            // Show upsell after demo finishes
            setTimeout(() => setShowUpsell(true), 500);
          }
        },
        (msg) => setProgress(msg)
      );

      setAudioUrl(result.audioUrl);
      stopRef.current = result.stop;

      // Simulate progress
      const genre = MUSIC_GENRES.find(g => g.id === genreId);
      const duration = genre?.bpm && genre.bpm > 150 ? 12 : 15;
      const startTime = Date.now();
      progressInterval.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(elapsed / duration, 1);
        setPlayProgress(pct);
        if (pct >= 1 && progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      }, 100);
    } catch (err) {
      console.error('Playback failed:', err);
      setPlayState('idle');
    }
  }, [genreId, lyrics, playState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopTTS();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const isPlaying = playState === 'playing';
  const isGenerating = playState === 'generating';

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-2xl overflow-hidden">
      {/* Album Art / Visual Header */}
      <div className={`relative h-48 bg-gradient-to-br ${pet?.color || 'from-zinc-700 to-zinc-800'} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative text-center z-10">
          <div className="text-6xl mb-2 drop-shadow-lg">{pet?.emoji || '🎵'}</div>
          <h2 className="text-2xl font-black drop-shadow-lg">{songTitle}</h2>
          <div className="text-sm opacity-80 mt-1">
            {pers?.label} {pet?.label} &middot; {genre?.label}
          </div>
        </div>

        {/* Genre badge */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold z-10">
          {genre?.emoji} {genre?.bpm} BPM
        </div>

        {/* Demo badge */}
        <div className="absolute top-4 left-4 bg-orange-500/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-black z-10 animate-pulse">
          DEMO HOOK
        </div>
      </div>

      {/* Player Controls */}
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-100"
              style={{ width: `${playProgress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-zinc-500">
            <span>{Math.floor(playProgress * 15)}s</span>
            <span>DEMO: 15s</span>
          </div>
        </div>

        {/* Play Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlay}
            disabled={isGenerating}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
              isPlaying
                ? 'bg-red-500 shadow-red-500/30 hover:bg-red-600'
                : isGenerating
                  ? 'bg-zinc-700 shadow-none animate-pulse'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105'
            }`}
          >
            {isGenerating ? (
              <div className="w-6 h-6 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex-1">
            <div className="font-bold text-lg">{isGenerating ? progress || 'Generating beat...' : songTitle}</div>
            <div className="text-sm text-zinc-400">
              {isPlaying ? '🔊 Playing demo hook...' : isGenerating ? 'Building the chaos...' : 'Press play to hear the demo hook'}
            </div>
          </div>
        </div>

        {/* Lyrics Preview */}
        <div className="mt-6 bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto">
          <div className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">Lyrics</div>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
            {lyrics}
          </pre>
        </div>

        {/* Copy button */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigator.clipboard.writeText(lyrics)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2.5 rounded-xl transition-all text-sm"
          >
            Copy Lyrics
          </button>
          <button
            onClick={handlePlay}
            disabled={isGenerating || isPlaying}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2.5 rounded-xl transition-all text-sm"
          >
            {isPlaying ? 'Playing...' : 'Play Again'}
          </button>
        </div>
      </div>

      {/* ─── UPSELL PAYWALL ─── */}
      {showUpsell && (
        <div className="border-t border-white/5 p-6">
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">🔥</div>
            <h3 className="text-xl font-black mb-2">Want the full version?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              You just heard the {genre?.bpm && genre.bpm > 150 ? '12' : '15'}-second hook.
              The full version is a complete 2-3 minute song with full production,
              mastered audio, and share-ready quality.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                {
                  label: 'Hook Demo',
                  price: 'FREE',
                  desc: `${genre?.bpm && genre.bpm > 150 ? '12' : '15'}s preview`,
                  current: true,
                },
                {
                  label: 'Full Song',
                  price: '$2.99',
                  desc: '2-3 min, mastered MP3',
                  current: false,
                },
                {
                  label: 'Share Package',
                  price: '$9.99',
                  desc: 'Song + pet slideshow',
                  current: false,
                },
              ].map((tier, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-center ${
                    tier.current
                      ? 'border-orange-500/30 bg-orange-500/5'
                      : 'border-white/5 bg-zinc-900/50'
                  }`}
                >
                  <div className="text-xs text-zinc-500 mb-1">{tier.label}</div>
                  <div className={`text-lg font-black ${tier.current ? 'text-orange-400' : 'text-zinc-300'}`}>
                    {tier.price}
                  </div>
                  <div className="text-[10px] text-zinc-500">{tier.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onUpsell?.()}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] transition-all"
              >
                Get Full Song — $2.99
              </button>
              <button
                onClick={() => setShowUpsell(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium py-3 rounded-xl transition-all text-sm"
              >
                Just the demo is fine
              </button>
            </div>

            <p className="text-[10px] text-zinc-600 mt-3">
              Full version includes: complete lyrics, professional AI music production, mastered MP3 download.
              Package adds: custom pet photo slideshow, share-ready video, and WAV file.
            </p>
          </div>
        </div>
      )}

      {/* Auto-show upsell trigger after first play */}
      {!showUpsell && hasPlayedOnce && (
        <div className="border-t border-white/5 p-4">
          <button
            onClick={() => setShowUpsell(true)}
            className="w-full text-center text-sm text-orange-400 hover:text-orange-300 font-medium py-2 transition-colors"
          >
            🔓 Unlock the full version →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── UPSELL MODAL ───────────────────────────────────────────────────────────

type UpsellModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  petType: string;
  genreId: string;
};

export function UpsellModal({ isOpen, onClose, songTitle, petType, genreId }: UpsellModalProps) {
  const [selectedTier, setSelectedTier] = useState<'full' | 'package'>('full');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const pet = PET_TYPES.find(p => p.id === petType);
  const genre = MUSIC_GENRES.find(g => g.id === genreId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{pet?.emoji || '🎵'}</div>
            <h2 className="text-2xl font-black mb-1">Unlock &ldquo;{songTitle}&rdquo;</h2>
            <p className="text-sm text-zinc-400">{pet?.label} &middot; {genre?.label}</p>
          </div>

          {!submitted ? (
            <>
              {/* Tier selection */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelectedTier('full')}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTier === 'full'
                      ? 'border-orange-500/60 bg-orange-500/5'
                      : 'border-white/5 bg-zinc-900 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">Full Song</div>
                      <div className="text-xs text-zinc-400">2-3 min mastered MP3 + WAV</div>
                    </div>
                    <div className="text-2xl font-black text-orange-400">$2.99</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedTier('package')}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTier === 'package'
                      ? 'border-orange-500/60 bg-orange-500/5'
                      : 'border-white/5 bg-zinc-900 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">Share Package</div>
                      <div className="text-xs text-zinc-400">Song + pet photo slideshow for Reels and TikTok</div>
                    </div>
                    <div className="text-2xl font-black text-orange-400">$9.99</div>
                  </div>
                </button>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1 block">Email for delivery</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Buy button */}
              <button
                onClick={() => setSubmitted(true)}
                disabled={!email.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-30 transition-all text-lg"
              >
                Get {selectedTier === 'full' ? 'Full Song' : 'Share Package'} — {selectedTier === 'full' ? '$2.99' : '$9.99'}
              </button>

              <p className="text-[10px] text-zinc-600 text-center mt-3">
                Payment processes securely. MP3 delivered instantly to your email.
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black mb-2">You&apos;re in!</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Your full {selectedTier === 'full' ? 'song' : 'package'} for &ldquo;{songTitle}&rdquo; is being produced.
                Check your email at {email} for the download link.
              </p>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 mb-4">
                <div className="text-xs text-zinc-500 mb-2">What happens next:</div>
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
                    AI produces full 2-3 minute song (~2 min)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
                    Professional mastering & quality check
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">3</span>
                    Download link sent to your email
                  </div>
                  {selectedTier === 'package' && (
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">4</span>
                      Pet photo slideshow export (24-48h)
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl transition-all"
              >
                Back to Chaos Studio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
