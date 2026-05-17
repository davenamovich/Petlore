'use client';

import { useState, useEffect } from 'react';

// ─── Crypto helpers (AES-GCM, Web Crypto API) ────────────────────────────────
const STORAGE_KEY = 'pae_k';
const APP_SALT = 'petlore-animation-engine-v1';

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptKey(plaintext: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(APP_SALT, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // Pack: salt(16) + iv(12) + ciphertext → base64
  const buf = new Uint8Array(salt.byteLength + iv.byteLength + cipher.byteLength);
  buf.set(salt, 0); buf.set(iv, 16); buf.set(new Uint8Array(cipher), 28);
  return btoa(String.fromCharCode(...buf));
}

async function decryptKey(blob: string): Promise<string> {
  const buf = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const salt = buf.slice(0, 16);
  const iv = buf.slice(16, 28);
  const cipher = buf.slice(28);
  const key = await deriveKey(APP_SALT, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

// ─── Data from Hermes skill JSONs ─────────────────────────────────────────────

const CHARACTER = {
  name: 'Biscuit the Bumbling',
  species: 'Corgi',
  personality: 'Overly enthusiastic, accident-prone, oblivious to his own chaos',
  voice: 'High-pitched, excitable — "Wooooo! Wait! Wait!"',
  catchphrases: ["It's not my fault!", "This is the best way to do this!", "Wait... that's not how it works..."],
  fears: ['Not being helpful enough', 'Losing his best friend (the cat)', 'Breaking something important'],
  outfit: ['Orange bandana', 'Tiny yellow rain boots'],
  accessories: ['Backpack of random items', 'Tiny hat that constantly falls off'],
  viralHook: 'A pet who makes everything worse but in the most lovable way',
};

const SCENES = [
  { n: 1, dur: 7, setting: 'Living room — giant pile of laundry', action: 'Biscuit pulls out a hat with great excitement', dialogue: '"This is the best hat for my adventure!"', gag: 'Hat floats up and starts to glow', cam: 'Wide → close-up on face' },
  { n: 2, dur: 6, setting: 'Kitchen — large sink', action: 'Throws hat into sink, bubble tornado forms', dialogue: '"Wait... that\'s not how it works..."', gag: "Hat's internal mechanism spins like a motor", cam: 'Low angle, looking up at bubbles' },
  { n: 3, dur: 8, setting: 'Backyard — garden', action: 'Hat propels him into the air with explosion', dialogue: '"I\'m flying! I\'m flying!"', gag: 'Hat spins in circles as he flies', cam: "Bird's eye view" },
  { n: 4, dur: 7, setting: 'Garage — random tools', action: 'Tries to fix flying hat with wrong tools', dialogue: '"I must be missing something important..."', gag: 'All tools are wrong size/shape', cam: 'Close-up of fumbling hands' },
  { n: 5, dur: 6, setting: 'Treehouse window', action: 'Desperate reach for floating hat', dialogue: '"Not again... please don\'t leave me!"', gag: 'Cat watches from branch, expressionless', cam: 'Wide shot of desperate reach' },
  { n: 6, dur: 8, setting: 'Front porch', action: 'Finds plant the cat wanted to grow', dialogue: '"Wait... this is exactly what I was looking for!"', gag: 'Hat accidentally lands and grows a flower', cam: 'Dolly-in then zoom-out' },
];

const VIDEO_PROMPTS = {
  veo: 'Cartoon orange corgi with white markings, 2D animated, 9:16 vertical format, exaggerated expressions, bright colors, viral short-form, cinematic lighting, dynamic angles, meme-optimized pacing.',
  kling: 'Animated cartoon pet, cute orange corgi (Biscuit) with white chest and paws, exaggerated expressions, 9:16 vertical, vibrant saturated colors, bold outlines, high energy, surreal cartoon environments.',
  runway: '2D animated pet character, orange corgi, expressive cartoon animation, 9:16 vertical, detailed character design, exaggerated facial features, colorful cartoon elements, comedic timing, bright vibrant colors.',
  thumbnail: 'Highly expressive cartoon pet character, orange corgi with white markings, wide-eyed surprised expression, bright saturated colors, 9:16 vertical format, bold outlines and dynamic composition, dramatic lighting, internet meme style, extreme close-up, meme-optimized visual design with readable text overlay',
};

const FRANCHISE = {
  episodes: ["Biscuit's Great Hat Adventure", "The Great Food Fiasco", "Biscuit vs. The Vacuum", "Cat's Revenge", "The Birthday Hat Disaster", "Biscuit's Great Sleepover", "When Biscuit Tried to Cook", "The Great Meme Collection", "The Pet Fashion Show", "Biscuit's Great Rescue Mission"],
  characters: ['The Cat — Cynical but caring', "Mr. Squeaky the Ferret — Loves squeaky toys", 'The Giggles — Mischievous parrot', 'Lady Lila the Poodle — Always judging', 'The Meme Bot — AI robot helping Biscuit'],
  locations: ['The Living Room', 'The Garden', 'The Kitchen', 'The Backyard', 'The Workshop'],
  expansion: ['PetLore Merch', 'PetLore Podcast', 'PetLore Movie', 'PetLore App', 'PetLore YouTube'],
};

const SOCIAL = {
  tiktok: "When you try to help your best friend but make everything worse 😂😭 #PetLore #PetComedy #CorgiLife #MemePet #ViralPet",
  youtube: "Biscuit's Hat Makes Everything WORSE - But in the Most LOVABLE Way! 🐾",
  pinned: "This is the most chaotic love story we've ever seen 🔥",
  cta: "Comment below if you've ever made something worse when trying to help!",
  teaser: "Next episode: Biscuit accidentally turns his favorite toy into a flying raccoon! 🐾",
};

type Tab = 'character' | 'scenes' | 'prompts' | 'social' | 'franchise' | 'refer';

export function AnimationEngine({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('character');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── ZenMux access gate ──────────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // ── Free tier & referral state ──────────────────────────────────────────────
  const REFERRAL_KEY = 'pae_ref';
  const FREE_CREATION_KEY = 'pae_free_creations';
  const [referralInput, setReferralInput] = useState('');
  const [savedReferral, setSavedReferral] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const [gateReferralInput, setGateReferralInput] = useState('');
  const [freeCreations, setFreeCreations] = useState<number>(0);
  const [accessMode, setAccessMode] = useState<'locked' | 'free' | 'byok'>('locked');

  // ── Video Generation State (Vessel Video Studio) ──────────────────────────
  const [generatingTool, setGeneratingTool] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{
    jobId: string;
    provider: string;
    modelId: string;
    status: string;
    progress?: number;
    resultUrl?: string;
    error?: string;
    statusUrlRaw?: string;
    resultUrlRaw?: string;
  } | null>(null);

  // On mount: restore key, referral link, free creations
  useEffect(() => {
    const blob = localStorage.getItem(STORAGE_KEY);
    const freeCntStr = localStorage.getItem(FREE_CREATION_KEY);
    const freeCnt = freeCntStr !== null ? parseInt(freeCntStr, 10) : 0;

    if (blob) {
      decryptKey(blob)
        .then(raw => verify(raw, true))
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          if (freeCnt > 0) {
            setFreeCreations(freeCnt);
            setUnlocked(true);
            setAccessMode('free');
          }
        });
    } else if (freeCnt > 0) {
      setFreeCreations(freeCnt);
      setUnlocked(true);
      setAccessMode('free');
    }

    const ref = localStorage.getItem(REFERRAL_KEY);
    if (ref) setSavedReferral(ref);
  }, []);

  function saveReferral() {
    const clean = referralInput.trim();
    if (!clean) return;
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url);
    setSavedReferral(url);
    setReferralInput('');
  }

  function handleClaimFree() {
    const clean = gateReferralInput.trim();
    if (!clean) {
      setGateError('Please paste your referral / affiliate link first.');
      return;
    }
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url);
    setSavedReferral(url);
    localStorage.setItem(FREE_CREATION_KEY, '1');
    setFreeCreations(1);
    setUnlocked(true);
    setAccessMode('free');
    setGateError(null);
  }

  function copyReferral() {
    if (!savedReferral) return;
    navigator.clipboard.writeText(savedReferral);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  }

  async function verify(key: string, silent = false) {
    if (!silent) setVerifying(true);
    setGateError(null);
    try {
      const res = await fetch('/api/chaos/auth/verify?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (data.valid) {
        setBalance(data.balance);
        setUnlocked(true);
        setAccessMode('byok');
        const encrypted = await encryptKey(key);
        localStorage.setItem(STORAGE_KEY, encrypted);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        if (!silent) setGateError(data.error || 'Verification failed.');
        if (freeCreations > 0) {
          setUnlocked(true);
          setAccessMode('free');
        } else {
          setUnlocked(false);
        }
      }
    } catch {
      if (!silent) setGateError('Network error — could not reach ZenMux.');
    } finally {
      if (!silent) setVerifying(false);
    }
  }

  async function renderVideoPrompt(toolKey: 'veo' | 'kling' | 'runway', isFreeCreation = false) {
    if (generatingTool !== null) return;
    setGeneratingTool(toolKey);
    setActiveJob(null);

    const prompt = VIDEO_PROMPTS[toolKey];
    const modelMap: Record<string, { forceModelId: string; forceProvider: string }> = {
      veo: { forceModelId: 'seedance-1.5-pro', forceProvider: 'zenmux' },
      kling: { forceModelId: 'seedance-1.5-pro', forceProvider: 'zenmux' },
      runway: { forceModelId: 'seedance-1.5-pro', forceProvider: 'zenmux' },
    };

    const target = modelMap[toolKey];

    try {
      const res = await fetch('/api/chaos/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          durationSeconds: 8,
          aspectRatio: '16:9',
          resolution: '1080p',
          generateAudio: true,
          forceModelId: target.forceModelId,
          forceProvider: target.forceProvider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`❌ Generation failed: ${data.error || 'Unknown error'}\n\n💡 Make sure Vessel Video Studio is running on port 3030 (npm run dev in vessel-video-studio).`);
        setGeneratingTool(null);
        return;
      }

      if (isFreeCreation) {
        setFreeCreations(0);
        localStorage.setItem(FREE_CREATION_KEY, '0');
        setAccessMode('byok');
      }

      setActiveJob({
        jobId: data.jobId,
        provider: data.provider,
        modelId: data.modelId,
        status: 'queued',
        statusUrlRaw: data.statusUrlRaw,
        resultUrlRaw: data.resultUrlRaw,
      });

      // Start polling
      pollJobStatus(data.jobId, data.provider, data.modelId, data.statusUrlRaw, data.resultUrlRaw);
    } catch {
      alert('❌ Network error: Could not reach video generation proxy. Please verify backend service.');
      setGeneratingTool(null);
    }
  }

  function pollJobStatus(jobId: string, provider: string, modelId: string, statusUrl?: string, resultUrl?: string) {
    const interval = setInterval(async () => {
      try {
        let url = `/api/chaos/video/status?jobId=${encodeURIComponent(jobId)}&provider=${encodeURIComponent(provider)}&modelId=${encodeURIComponent(modelId)}`;
        if (statusUrl) url += `&statusUrl=${encodeURIComponent(statusUrl)}`;
        if (resultUrl) url += `&resultUrl=${encodeURIComponent(resultUrl)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const statusData = await res.json();

        setActiveJob(prev => prev ? {
          ...prev,
          status: statusData.status,
          progress: statusData.progress || prev.progress,
          resultUrl: statusData.resultUrl,
          error: statusData.error,
        } : null);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          setGeneratingTool(null);
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setBalance(null);
    setApiKeyInput('');
    setAccessMode('locked');
  }

  // ── Gate screen ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold flex items-center gap-2"><span>🎬</span> PETLORE ANIMATION ENGINE</span>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-6">
            {/* Hero */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-500 flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/40 mb-4 animate-bounce">
                🎁
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Get 1 Free Video Creation!
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Sign up for a free ZenMux account and save your affiliate link below to unlock full studio access + claim your free video creation instantly.
              </p>
            </div>

            {/* Option 1: Free Tier Onboarding */}
            <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-purple-500/10 rounded-2xl p-6 border border-orange-500/30 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-orange-400 uppercase tracking-widest mb-3 font-bold">
                <span>⭐</span> Step 1: Claim Free Access
              </div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">
                ZenMux Referral / Affiliate Link:
              </label>
              <input
                type="text"
                value={gateReferralInput}
                onChange={e => setGateReferralInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleClaimFree()}
                placeholder="https://zenmux.ai/invite/... or code"
                className="w-full bg-black/70 border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/80 transition-colors font-mono mb-4 shadow-inner"
              />
              <button
                onClick={handleClaimFree}
                disabled={!gateReferralInput.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <span>🎉</span> Claim 1 Free Video & Unlock Studio
              </button>
              <div className="mt-3 text-center">
                <a
                  href="https://zenmux.ai/invite/4E9SOE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
                >
                  Get your referral link at ZenMux →
                </a>
              </div>
            </div>

            {/* Option 2: BYOK */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">
                <span>🔑</span> Step 2: Bring Your Own Key (BYOK)
              </div>
              <p className="text-xs text-zinc-400">
                Already have a ZenMux API key with a positive balance (&gt; $0)? Connect it below for unlimited renders.
              </p>
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && apiKeyInput && verify(apiKeyInput)}
                placeholder="sk-ai-v1-... or sk-ss-v1-..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
              />
              <button
                onClick={() => verify(apiKeyInput)}
                disabled={verifying || !apiKeyInput.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                ) : (
                  <>⚡ Unlock Scene Builder</>
                )}
              </button>
              {gateError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                  {gateError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked: copy helper ────────────────────────────────────────────────────
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'character', label: '🐾 Character Bible' },
    { id: 'scenes', label: '🎬 Scene Breakdown' },
    { id: 'prompts', label: '🤖 AI Video Prompts' },
    { id: 'social', label: '📱 Social Pack' },
    { id: 'franchise', label: '🏆 Franchise' },
    { id: 'refer', label: '📤 Refer Friends' },
  ];

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
            <span className="text-sm font-bold flex items-center gap-2">
              <span>🎬</span> PETLORE ANIMATION ENGINE
            </span>
          </div>
          <div className="flex items-center gap-3">
            {accessMode === 'free' ? (
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/10 animate-pulse">
                <span>🎁</span> {freeCreations} Free Video Remaining
              </span>
            ) : balance !== null ? (
              <span className="text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                ${balance.toFixed(2)} credit
              </span>
            ) : null}
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono">
              lock
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-3xl shadow-xl shadow-purple-500/30">
              🐶
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                {CHARACTER.name}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">{CHARACTER.viralHook}</p>
            </div>
          </div>

          {/* Episode banner */}
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-purple-400 font-mono uppercase tracking-widest mb-1">Episode 1 — Now In Production</div>
              <div className="text-white font-black text-lg">Biscuit&apos;s Great Hat Adventure</div>
              <div className="text-zinc-400 text-sm mt-1">
                When Biscuit accidentally turns his hat into a rocket, he must navigate the dangers of his own over-enthusiastic inventions while the cat watches with growing concern.
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {SCENES.map(s => (
                <div key={s.n} className="bg-white/5 rounded-xl px-3 py-2 text-center border border-white/5">
                  <div className="text-lg font-black text-purple-400">{s.n}</div>
                  <div className="text-[10px] text-zinc-500">{s.dur}s</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CHARACTER BIBLE ── */}
        {tab === 'character' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-4">Identity</h3>
              <dl className="space-y-3">
                {([['Species', `${CHARACTER.species} (eternal puppy, age 2)`], ['Voice', CHARACTER.voice], ['Personality', CHARACTER.personality]] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] text-zinc-500 uppercase tracking-wider">{k}</dt>
                    <dd className="text-sm text-white mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-pink-400 uppercase tracking-widest mb-4">Signature Colors</h3>
              <div className="flex gap-3 mb-5">
                {([['#FF7B00', 'Orange'], ['#FFFFFF', 'White'], ['#1A1A1A', 'Black']] as [string, string][]).map(([hex, name]) => (
                  <div key={hex} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-xl border border-white/10 shadow-lg" style={{ background: hex }} />
                    <span className="text-[10px] text-zinc-400">{name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{hex}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-xs font-mono text-pink-400 uppercase tracking-widest mb-3">Outfit & Accessories</h3>
              <div className="flex flex-wrap gap-2">
                {[...CHARACTER.outfit, ...CHARACTER.accessories].map(item => (
                  <span key={item} className="bg-white/5 text-zinc-300 text-xs px-3 py-1 rounded-full border border-white/10">{item}</span>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-4">Catchphrases</h3>
              <div className="space-y-2">
                {CHARACTER.catchphrases.map(phrase => (
                  <div key={phrase} className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-orange-200 italic">
                    {phrase}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-red-400 uppercase tracking-widest mb-4">Fears & Goals</h3>
              <div className="space-y-2 mb-4">
                {CHARACTER.fears.map(fear => (
                  <div key={fear} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-red-400">😰</span> {fear}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4 space-y-2">
                {['Make everyone happy through clumsy efforts', 'Discover the perfect way to clean up his chaos'].map(goal => (
                  <div key={goal} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-green-400">🎯</span> {goal}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SCENE BREAKDOWN ── */}
        {tab === 'scenes' && (
          <div className="space-y-4">
            {SCENES.map(scene => (
              <div key={scene.n} className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-purple-500/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <div className="text-xl font-black text-purple-400">{scene.n}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{scene.dur}s</span>
                      <span className="text-xs text-zinc-400">{scene.setting}</span>
                      <span className="text-xs text-zinc-500 italic">{scene.cam}</span>
                    </div>
                    <p className="text-sm text-white mb-2">{scene.action}</p>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-purple-200 italic mb-2">
                      {scene.dialogue}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <span className="text-yellow-400">🎭</span> Visual gag: {scene.gag}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-500/20 rounded-2xl p-4">
              <div className="text-xs text-green-400 font-mono uppercase tracking-widest mb-1">Ending Gag</div>
              <p className="text-sm text-zinc-300">
                Biscuit accidentally knocks the hat into the fire — it creates a beautiful flower the cat always wanted to grow.
                He&apos;s so focused on the destruction he doesn&apos;t notice his friend&apos;s smile.
              </p>
            </div>
          </div>
        )}

        {/* ── AI VIDEO PROMPTS ── */}
        {tab === 'prompts' && (
          <div className="space-y-6">
            {activeJob && (
              <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping" />
                    <span className="text-sm font-bold uppercase tracking-wider text-purple-300">
                      Vessel Video Studio ({activeJob.provider} • {activeJob.modelId})
                    </span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-mono uppercase font-black ${
                    activeJob.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/40' :
                    activeJob.status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                    'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                  }`}>
                    {activeJob.status} {activeJob.progress !== undefined && activeJob.status !== 'completed' ? `(${activeJob.progress}%)` : ''}
                  </span>
                </div>

                {activeJob.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
                    {activeJob.error}
                  </div>
                )}

                {activeJob.resultUrl && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs text-green-400 font-mono flex items-center gap-1.5">
                      <span>🎉</span> Generation Complete! Here is your rendered video:
                    </div>
                    <video
                      src={activeJob.resultUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full max-h-96 rounded-xl border border-white/10 shadow-2xl bg-black"
                    />
                    <div className="flex justify-end">
                      <a
                        href={activeJob.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-lg transition-all"
                      >
                        💾 Download Video
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {accessMode === 'free' && freeCreations > 0 && (
              <div className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-purple-500/20 border border-orange-500/40 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
                <div>
                  <div className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-1 font-bold">🎁 1 Free Creation Unlocked</div>
                  <h3 className="text-xl font-black text-white mb-1">Ready to render your first animation?</h3>
                  <p className="text-sm text-zinc-300">Your saved referral link granted you 1 free AI video generation across Veo, Kling, or Runway models.</p>
                </div>
                <button
                  onClick={() => renderVideoPrompt('kling', true)}
                  disabled={generatingTool !== null}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-black px-6 py-3.5 rounded-xl shadow-xl shadow-orange-500/30 whitespace-nowrap transition-all hover:scale-105 flex items-center gap-2"
                >
                  {generatingTool ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Rendering Video...</>
                  ) : (
                    <><span>🚀</span> Produce AI Video (Use Free Credit)</>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {(['veo', 'kling', 'runway'] as const).map(tool => {
                const meta: Record<string, { label: string; color: string; emoji: string }> = {
                  veo: { label: 'Google Veo', color: 'from-blue-500 to-cyan-500', emoji: '🔵' },
                  kling: { label: 'Kling AI', color: 'from-pink-500 to-rose-500', emoji: '🌸' },
                  runway: { label: 'Runway ML / Seedance', color: 'from-violet-500 to-purple-500', emoji: '🟣' },
                };
                const m = meta[tool];
                return (
                  <div key={tool} className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span>{m.emoji}</span>
                        <span className={`text-sm font-black bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>{m.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => renderVideoPrompt(tool)}
                          disabled={generatingTool !== null}
                          className="text-xs font-black bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center gap-1.5 text-white"
                        >
                          {generatingTool === tool ? (
                            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Rendering...</>
                          ) : (
                            <><span>🎬</span> Render Animation (Vessel Studio)</>
                          )}
                        </button>
                        <button
                          onClick={() => copy(VIDEO_PROMPTS[tool], tool)}
                          className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-all text-white"
                        >
                          {copiedKey === tool ? '✓ Copied!' : '📋 Copy Prompt'}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed bg-black/30 rounded-xl p-4 font-mono">
                      {VIDEO_PROMPTS[tool]}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono text-orange-400 uppercase tracking-widest">Thumbnail Prompt</h3>
                <button
                  onClick={() => copy(VIDEO_PROMPTS.thumbnail, 'thumb')}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                >
                  {copiedKey === 'thumb' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="text-sm text-zinc-300 bg-black/30 rounded-xl p-4 font-mono mb-4">{VIDEO_PROMPTS.thumbnail}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Expression', value: 'Wide-eyed shocked, mouth open, eyebrows raised high' },
                  { label: 'Clickbait Text', value: "WHEN YOUR BEST FRIEND SAYS 'YOU'RE MAKING THIS WORSE' 😂" },
                  { label: 'Emotional Trigger', value: 'Relatable chaos and comedic failure' },
                ].map(item => (
                  <div key={item.label} className="bg-black/30 rounded-xl p-3">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-sm text-zinc-200">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SOCIAL PACK ── */}
        {tab === 'social' && (
          <div className="space-y-4">
            {[
              { key: 'tiktok', label: 'TikTok Caption', emoji: '🎵', text: SOCIAL.tiktok },
              { key: 'youtube', label: 'YouTube Shorts Title', emoji: '▶️', text: SOCIAL.youtube },
              { key: 'pinned', label: 'Pinned Comment', emoji: '📌', text: SOCIAL.pinned },
              { key: 'cta', label: 'Engagement CTA', emoji: '💬', text: SOCIAL.cta },
              { key: 'teaser', label: 'Sequel Teaser', emoji: '🔮', text: SOCIAL.teaser },
            ].map(item => (
              <div key={item.key} className="bg-white/5 rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                <span className="text-2xl mt-0.5 flex-shrink-0">{item.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{item.label}</span>
                    <button
                      onClick={() => copy(item.text, item.key)}
                      className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all"
                    >
                      {copiedKey === item.key ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-white">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FRANCHISE ── */}
        {tab === 'franchise' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-4">📺 Episode Pipeline</h3>
              <div className="space-y-2">
                {FRANCHISE.episodes.map((ep, i) => (
                  <div key={ep} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-600 w-5">{i + 1}</span>
                    <div className={`flex-1 text-sm py-2 px-3 rounded-lg ${
                      i === 0
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 transition-colors'
                    }`}>
                      {ep}
                      {i === 0 && <span className="ml-2 text-[10px] text-purple-400 font-mono">IN PRODUCTION</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-pink-400 uppercase tracking-widest mb-4">👥 Recurring Characters</h3>
                <div className="space-y-2">
                  {FRANCHISE.characters.map(c => (
                    <div key={c} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span> {c}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-green-400 uppercase tracking-widest mb-4">🏆 Franchise Expansion</h3>
                <div className="flex flex-wrap gap-2">
                  {FRANCHISE.expansion.map(item => (
                    <span key={item} className="bg-green-500/10 text-green-300 border border-green-500/20 text-xs px-3 py-1.5 rounded-full">{item}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-4">📍 Recurring Locations</h3>
                <div className="space-y-1.5">
                  {FRANCHISE.locations.map(loc => (
                    <div key={loc} className="text-sm text-zinc-300 flex items-center gap-2">
                      <span className="text-blue-400">📍</span> {loc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REFER FRIENDS ── */}
        {tab === 'refer' && (
          <div className="space-y-5">
            {/* Pitch banner */}
            <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-500/20 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h2 className="text-2xl font-black text-white mb-2">Refer a Friend, Earn $5</h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto mb-5">
                Every friend who signs up with your link and loads credit gets a
                <span className="text-green-400 font-bold"> 25% bonus</span> on their first top-up.
                You earn <span className="text-yellow-400 font-bold">$5</span> for each referral.
                Make <span className="text-white font-bold">10 spots</span> and pocket $50.
              </p>
              {/* 10-spot progress */}
              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-xl border-2 border-dashed border-green-500/30 flex items-center justify-center text-lg"
                    title={`Spot ${i + 1}`}
                  >
                    <span className="text-zinc-600">#{i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-3 font-mono">Track your referrals at zenmux.ai/platform</p>
            </div>

            {/* Incentive cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="text-2xl mb-2">🎁</div>
                <h3 className="text-sm font-black text-white mb-1">Your friend gets</h3>
                <p className="text-3xl font-black text-green-400">+25%</p>
                <p className="text-xs text-zinc-400 mt-1">bonus credit on their first top-up when they sign up with your link</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="text-sm font-black text-white mb-1">You get</h3>
                <p className="text-3xl font-black text-yellow-400">$5</p>
                <p className="text-xs text-zinc-400 mt-1">per successful referral, up to 10 spots = $50 total</p>
              </div>
            </div>

            {/* Link manager */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
                Your ZenMux Referral Link
              </h3>

              {savedReferral ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/50 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-300 font-mono truncate">
                      {savedReferral}
                    </div>
                    <button
                      onClick={copyReferral}
                      className="flex-shrink-0 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 text-sm font-bold px-4 py-3 rounded-xl transition-all"
                    >
                      {refCopied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem(REFERRAL_KEY); setSavedReferral(null); }}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Change link
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Paste your referral code or full URL from{' '}
                    <a href="https://zenmux.ai/platform" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a>
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={referralInput}
                      onChange={e => setReferralInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveReferral()}
                      placeholder="4E9SOE or https://zenmux.ai/invite/..."
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-colors font-mono"
                    />
                    <button
                      onClick={saveReferral}
                      disabled={!referralInput.trim()}
                      className="flex-shrink-0 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 border border-purple-500/30 text-purple-300 text-sm font-bold px-4 py-3 rounded-xl transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Share templates */}
            {savedReferral && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Ready-to-send message</h3>
                <div className="bg-black/40 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed mb-3">
                  Hey! I&apos;ve been using ZenMux to access 100+ AI models and it&apos;s been great for building with PetLore.
                  Sign up with my link and you&apos;ll get a 25% bonus on your first top-up:
                  {' '}<span className="text-green-400 font-mono">{savedReferral}</span>
                </div>
                <button
                  onClick={() => {
                    const msg = `Hey! I've been using ZenMux to access 100+ AI models and it's been great for building with PetLore. Sign up with my link and you'll get a 25% bonus on your first top-up: ${savedReferral}`;
                    navigator.clipboard.writeText(msg);
                    setRefCopied(true);
                    setTimeout(() => setRefCopied(false), 2000);
                  }}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                >
                  {refCopied ? '✓ Copied!' : '📋 Copy message'}
                </button>
              </div>
            )}

            {/* Default invite CTA (pre-save) */}
            {!savedReferral && (
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Don&apos;t have your referral link yet?</div>
                  <div className="text-xs text-zinc-400">Find it at zenmux.ai/platform after signing up</div>
                </div>
                <a
                  href="https://zenmux.ai/invite/4E9SOE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 bg-white text-black font-black text-xs px-4 py-2 rounded-xl hover:bg-zinc-100 transition-all"
                >
                  Sign up
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
