'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pvpa_k';         // encrypted ZenMux API key
const REFERRAL_KEY = 'pvpa_ref';      // user's own ZenMux referral link
const FREE_CREDITS_KEY = 'pvpa_free'; // free generation credits
const APP_SALT = 'petlore-viral-photo-v1';
const ZENMUX_SIGNUP = 'https://zenmux.ai/invite/4E9SOE'; // Petlore affiliate link
const ZENMUX_PLATFORM = 'https://zenmux.ai/platform';

// Extract referral code from a ZenMux invite URL or bare code
function extractRefCode(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  const match = clean.match(/invite\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  // bare code like "4E9SOE"
  if (/^[A-Za-z0-9]{4,12}$/.test(clean)) return clean;
  return null;
}

// Build a shareable Petlore URL that pre-fills the gate with the user's referral code
function buildShareUrl(refCode: string): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin + window.location.pathname;
  return `${base}?ref=${refCode}`;
}

// Read ?ref= from URL on load
function getInboundRef(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('ref') || '';
}

// ─── CRYPTO (AES-GCM via Web Crypto API) ─────────────────────────────────────

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptKey(plaintext: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(APP_SALT, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
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

// ─── TYPES ───────────────────────────────────────────────────────────────────

type AccessMode = 'locked' | 'free' | 'byok';
type Stage = 'upload' | 'analyzing' | 'profile' | 'style' | 'generating' | 'result';

type PetProfile = {
  petName: string;
  species: string;
  breedEstimate: string;
  furColors: string[];
  markings: string;
  eyeColor: string;
  earShape: string;
  sizeAndBuild: string;
  expression: string;
  personalityVibe: string;
  mostRecognizableTraits: string[];
  mustNeverChange: string[];
  thumbnailReadabilityScore: string;
};

type UploadedPhoto = { file: File; url: string; label: string };

// ─── VIRAL STYLES ────────────────────────────────────────────────────────────

const VIRAL_STYLES = [
  { id: 'movie_poster',     emoji: '🎬', label: 'Movie Poster',         desc: 'Cinematic blockbuster with title area and epic lighting' },
  { id: 'rap_album',        emoji: '🎤', label: 'Rap Album Cover',      desc: 'Hip-hop icon vibes — luxury, bold contrast, gold accents' },
  { id: 'motivational',     emoji: '💪', label: 'Motivational Poster',  desc: 'Heroic sunrise portrait with inspirational energy' },
  { id: 'anime_hero',       emoji: '⚡', label: 'Anime Hero',           desc: 'Action pose with glowing aura and dramatic wind effects' },
  { id: 'mafia_boss',       emoji: '🕴️', label: 'Mafia Boss',           desc: 'Crime boss parody — leather chair, deep shadows, serious' },
  { id: 'ceo_pet',          emoji: '💼', label: 'CEO Pet',              desc: 'Startup founder in the boardroom — confident and visionary' },
  { id: 'gym_bro',          emoji: '🏋️', label: 'Gym Bro',             desc: 'Post-workout pump, dramatic gym lighting, no days off' },
  { id: 'disney_adventure', emoji: '✨', label: 'Disney Adventure',     desc: 'Magical storybook scene with painterly warmth' },
  { id: 'fantasy_warrior',  emoji: '⚔️', label: 'Fantasy Warrior',      desc: 'Epic armor and mystical atmosphere, battle-ready' },
  { id: 'luxury_influencer',emoji: '🛥️', label: 'Luxury Influencer',   desc: 'Yacht, penthouse, private jet — editorial magazine quality' },
  { id: 'meme_reaction',    emoji: '😐', label: 'Meme Reaction',        desc: 'Side-eye, shocked, smug — caption-ready and viral' },
  { id: 'sports_legend',    emoji: '🏆', label: 'Sports Legend',        desc: 'Championship moment with stadium spotlight energy' },
  { id: 'rescue_hero',      emoji: '🦸', label: 'Rescue Hero',          desc: 'Hero gear, dramatic sky, saving the day with style' },
  { id: 'birthday_star',    emoji: '🎂', label: 'Birthday Star',        desc: 'Confetti, balloons, joyful celebration portrait' },
  { id: 'memorial_tribute', emoji: '🌟', label: 'Memorial Tribute',     desc: 'Soft ethereal portrait — dignified, timeless, beautiful' },
];

const PHOTO_SLOTS = [
  { label: 'Front-facing photo', hint: 'Best for identity capture', required: true },
  { label: 'Side profile',       hint: 'Helps with full identity lock', required: false },
  { label: 'Personality shot',   hint: 'Their most "them" moment', required: false },
  { label: 'With toy/outfit',    hint: 'Optional — adds character', required: false },
];

// ─── ACCESS GATE ─────────────────────────────────────────────────────────────

function AccessGate({
  onUnlocked,
  savedReferral,
  setSavedReferral,
  inboundRef,
}: {
  onUnlocked: (mode: AccessMode, key?: string) => void;
  savedReferral: string | null;
  setSavedReferral: (r: string | null) => void;
  inboundRef: string;
}) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  // Pre-fill referral input from URL param if present
  const [referralInput, setReferralInput] = useState(
    inboundRef ? `https://zenmux.ai/invite/${inboundRef}` : ''
  );
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'free' | 'byok'>('free');

  function handleClaimFree() {
    const clean = referralInput.trim();
    if (!clean) { setError('Paste your ZenMux referral link to unlock access.'); return; }
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url);
    localStorage.setItem(FREE_CREDITS_KEY, '1');
    setSavedReferral(url);
    onUnlocked('free');
  }

  async function handleVerify() {
    const key = apiKeyInput.trim();
    if (!key) { setError('Enter your ZenMux API key.'); return; }
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/chaos/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (data.valid) {
        const encrypted = await encryptKey(key);
        localStorage.setItem(STORAGE_KEY, encrypted);
        onUnlocked('byok', key);
      } else {
        setError(data.error || 'Verification failed. Check your key at zenmux.ai/platform.');
      }
    } catch {
      setError('Network error — could not reach ZenMux.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Inbound referral banner */}
        {inboundRef && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-xl">🎁</span>
            <div>
              <div className="font-bold text-white text-sm">A friend shared this with you</div>
              <div className="text-xs text-zinc-400">Their referral link is pre-filled below. Save it to unlock your first photo.</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-purple-500/30">
            📸
          </div>
          <h2 className="text-3xl font-black mb-2">Unlock Viral Pet Photos</h2>
          <p className="text-zinc-400">
            Transform your pet into a movie star, meme icon, or anime hero — with their identity locked in.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-zinc-950 border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => { setTab('free'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'free' ? 'bg-purple-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            1 Free Photo
          </button>
          <button
            onClick={() => { setTab('byok'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'byok' ? 'bg-purple-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            Unlimited Access
          </button>
        </div>

        {/* Free tier */}
        {tab === 'free' && (
          <div className="bg-zinc-950 border border-purple-500/20 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎁</span>
              <span className="font-black text-white">1 Free Photo</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">FREE</span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Sign up for ZenMux (free) and grab your personal referral link. Save it here to unlock your first viral pet photo.
              When friends use your link to sign up, <span className="text-yellow-400 font-bold">ZenMux pays you $5</span> per signup.
            </p>

            <div className="space-y-3">
              <a
                href={ZENMUX_SIGNUP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl px-4 py-3 hover:border-purple-500/60 transition-all group"
              >
                <div>
                  <div className="font-bold text-white text-sm">1. Create your free ZenMux account →</div>
                  <div className="text-xs text-zinc-400">Takes 30 seconds • Gets you your referral link</div>
                </div>
                <span className="text-zinc-400 group-hover:translate-x-1 transition-transform">→</span>
              </a>

              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">
                  2. Paste your ZenMux referral link
                </label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={e => setReferralInput(e.target.value)}
                  placeholder="https://zenmux.ai/invite/YOURCODE"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-600 mt-1.5">
                  Find yours at <a href={ZENMUX_PLATFORM} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a> → Referrals
                </p>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

              <button
                onClick={handleClaimFree}
                disabled={!referralInput.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 transition-all"
              >
                Save Link & Unlock Free Photo →
              </button>
            </div>
          </div>
        )}

        {/* BYOK */}
        {tab === 'byok' && (
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚡</span>
              <span className="font-black text-white">ZenMux API Key</span>
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">UNLIMITED</span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Connect your ZenMux account for unlimited viral photo generations.
              ZenMux gives you access to 100+ AI models including OpenAI, Claude, and more through one gateway.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">ZenMux API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  placeholder="zenmux-..."
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-600 mt-1.5">
                  Find at <a href={ZENMUX_PLATFORM} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a> → API Keys
                </p>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={verifying || !apiKeyInput.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                ) : (
                  'Connect & Unlock Unlimited →'
                )}
              </button>

              <div className="text-center">
                <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
                  Don&apos;t have an account? Sign up free at ZenMux →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Earnings callout */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">💰</span>
            <div>
              <div className="font-bold text-white mb-1">Share your page → friends sign up → you earn $5</div>
              <div className="text-zinc-400 text-xs">
                ZenMux pays <strong className="text-yellow-400">$5 per referral</strong> (up to 10 = $50).
                Once you&apos;re in, we&apos;ll give you a shareable link for this page with your code embedded — so every friend who clicks it signs up through you automatically.
                More ways to earn photos coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHARE PANEL ─────────────────────────────────────────────────────────────

function SharePanel({
  petName,
  styleName,
  savedReferral,
  onSaveReferral,
}: {
  petName: string;
  styleName: string;
  savedReferral: string | null;
  onSaveReferral: (link: string) => void;
}) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const displayName = petName && petName !== 'Unknown' ? petName : 'My pet';

  // Build a Petlore share URL with the user's referral code embedded
  const refCode = savedReferral ? extractRefCode(savedReferral) : null;
  const petloreShareUrl = refCode ? buildShareUrl(refCode) : (typeof window !== 'undefined' ? window.location.origin : '');
  const shareTarget = petloreShareUrl; // friends land on Petlore with ref pre-filled

  const shareMessages = [
    {
      label: 'Text / iMessage',
      emoji: '💬',
      text: `${displayName} just went viral 😭 Made this with PetLore — it turns your pet into AI-generated movie posters, memes, anime heroes and more. Try it: ${shareTarget}`,
    },
    {
      label: 'Instagram / TikTok',
      emoji: '📱',
      text: `POV your pet becomes the main character 🐾 Made this ${styleName} of ${displayName} with @PetLore and I can't stop looking at it. Make yours (link in bio): ${shareTarget}`,
    },
    {
      label: 'Group Chat',
      emoji: '🔥',
      text: `ok everyone needs to do this with their pets immediately. ${displayName} as a ${styleName}. Try it: ${shareTarget}`,
    },
  ];

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function saveLink() {
    const clean = input.trim();
    if (!clean) return;
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url);
    onSaveReferral(url);
    setInput('');
  }

  return (
    <div className="space-y-4">
      {/* Earnings header */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💰</span>
          <span className="font-black text-white">Share your page → earn $5 per signup</span>
        </div>
        <p className="text-sm text-zinc-400">
          The link below takes friends straight to this page with your referral code embedded.
          When they sign up for ZenMux through your link, <strong className="text-yellow-400">ZenMux pays you $5</strong> — up to $50 total.
          More ways to earn coming soon.
        </p>
      </div>

      {/* Your shareable Petlore page link */}
      {savedReferral && refCode ? (
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Your Shareable Page Link</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-purple-300 bg-black px-3 py-2 rounded-lg border border-white/5 truncate font-mono">
                {petloreShareUrl}
              </code>
              <button
                onClick={() => copy(petloreShareUrl, 'pagelink')}
                className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all whitespace-nowrap"
              >
                {copied === 'pagelink' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Friends who open this link land on PetLore with your code pre-filled — they sign up through you.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Track your earnings</div>
            <a href={ZENMUX_PLATFORM} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
              zenmux.ai/platform → Referrals
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-purple-500/20 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-2">Save Your Referral Link</div>
          <p className="text-xs text-zinc-400 mb-3">
            Add your ZenMux referral link to include it in share messages and track your earnings.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://zenmux.ai/invite/YOURCODE"
              className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={saveLink}
              disabled={!input.trim()}
              className="bg-purple-500 hover:bg-purple-600 disabled:opacity-30 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
            >
              Save
            </button>
          </div>
          <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-400 hover:underline mt-2 block">
            Don&apos;t have one? Get your referral link at ZenMux →
          </a>
        </div>
      )}

      {/* Pre-written share messages */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Ready-to-send messages</div>
        {shareMessages.map((msg, i) => (
          <div key={i} className="bg-zinc-950 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-300">{msg.emoji} {msg.label}</span>
              <button
                onClick={() => copy(msg.text, `msg-${i}`)}
                className="text-xs bg-white/5 hover:bg-white/10 text-zinc-300 px-3 py-1 rounded-lg transition-all"
              >
                {copied === `msg-${i}` ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{msg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ViralPhotoAgent({ onBack }: { onBack: () => void }) {
  // ── Access gate state ───────────────────────────────────────────────────────
  const [accessMode, setAccessMode] = useState<AccessMode>('locked');
  const [resolvedKey, setResolvedKey] = useState<string | undefined>();
  const [freeCredits, setFreeCredits] = useState(0);
  const [savedReferral, setSavedReferral] = useState<string | null>(null);
  const [inboundRef] = useState<string>(() => getInboundRef());

  // ── Wizard state ─────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('upload');
  const [photos, setPhotos] = useState<(UploadedPhoto | null)[]>([null, null, null, null]);
  const [petName, setPetName] = useState('');
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultCaption, setResultCaption] = useState('');
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // ── Restore session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const freeCntStr = localStorage.getItem(FREE_CREDITS_KEY);
    const freeCnt = freeCntStr !== null ? parseInt(freeCntStr, 10) : 0;
    const ref = localStorage.getItem(REFERRAL_KEY);
    if (ref) setSavedReferral(ref);

    const blob = localStorage.getItem(STORAGE_KEY);
    if (blob) {
      decryptKey(blob)
        .then(raw => {
          setResolvedKey(raw);
          setAccessMode('byok');
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          if (freeCnt > 0) {
            setFreeCredits(freeCnt);
            setAccessMode('free');
          }
        });
    } else if (freeCnt > 0) {
      setFreeCredits(freeCnt);
      setAccessMode('free');
    }
  }, []);

  function handleUnlocked(mode: AccessMode, key?: string) {
    setAccessMode(mode);
    if (key) setResolvedKey(key);
    if (mode === 'free') {
      setFreeCredits(1);
    }
  }

  // ── Photo helpers ────────────────────────────────────────────────────────────
  const primaryPhoto = photos[0];
  const uploadedPhotos = photos.filter(Boolean) as UploadedPhoto[];

  const handlePhotoUpload = useCallback((index: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPhotos(prev => {
      const next = [...prev];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = { file, url, label: PHOTO_SLOTS[index].label };
      return next;
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => {
      const next = [...prev];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = null;
      return next;
    });
  }, []);

  const toBase64 = (url: string): Promise<string> =>
    fetch(url).then(r => r.blob()).then(
      blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
    );

  // ── Analyze ──────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!primaryPhoto) return;
    setError('');
    setStage('analyzing');
    try {
      const b64Images = await Promise.all(uploadedPhotos.map(p => toBase64(p.url)));
      const res = await fetch('/api/chaos/viral-photo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: b64Images, petName: petName || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');
      setProfile(data.profile);
      setStage('profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStage('upload');
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!primaryPhoto || !selectedStyle) return;
    if (accessMode === 'free' && freeCredits <= 0) {
      setError('No free credits remaining. Sign up for ZenMux to generate more.');
      return;
    }
    setError('');
    setStage('generating');
    try {
      const b64 = await toBase64(primaryPhoto.url);
      const res = await fetch('/api/chaos/viral-photo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: b64,
          viralAngle: selectedStyle,
          petProfile: profile,
          userApiKey: resolvedKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');

      // Deduct free credit
      if (accessMode === 'free') {
        const remaining = freeCredits - 1;
        setFreeCredits(remaining);
        localStorage.setItem(FREE_CREDITS_KEY, String(remaining));
      }

      setResultUrl(data.url);
      setResultCaption(data.caption);
      setStage('result');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStage('style');
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    photos.forEach(p => p && URL.revokeObjectURL(p.url));
    setPhotos([null, null, null, null]);
    setPetName('');
    setProfile(null);
    setSelectedStyle('');
    setResultUrl('');
    setResultCaption('');
    setError('');
    setShowShare(false);
    setStage('upload');
  };

  const selectedStyleMeta = VIRAL_STYLES.find(s => s.id === selectedStyle);

  // ── Gate ─────────────────────────────────────────────────────────────────────
  if (accessMode === 'locked') {
    return (
      <div className="min-h-screen bg-black text-white">
        <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black">VP</div>
            <span className="text-sm font-bold">VIRAL PHOTO AGENT</span>
          </div>
        </nav>
        <AccessGate
          onUnlocked={handleUnlocked}
          savedReferral={savedReferral}
          setSavedReferral={setSavedReferral}
          inboundRef={inboundRef}
        />
      </div>
    );
  }

  // ── Main wizard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black">VP</div>
            <span className="text-sm font-bold">VIRAL PHOTO AGENT</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Access badge */}
            {accessMode === 'free' && (
              <div className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${freeCredits > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                {freeCredits} free photo{freeCredits !== 1 ? 's' : ''} left
              </div>
            )}
            {accessMode === 'byok' && (
              <div className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-purple-500/10 border-purple-500/30 text-purple-400">
                ⚡ Unlimited
              </div>
            )}

            {/* Stage indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
              {(['upload', 'profile', 'style', 'result'] as const).map((s, i) => {
                const order = ['upload', 'analyzing', 'profile', 'style', 'generating', 'result'];
                const active = order.indexOf(stage) >= order.indexOf(s);
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={active ? 'text-purple-400' : 'text-zinc-600'}>{s.toUpperCase()}</span>
                    {i < 3 && <span className="text-zinc-700">→</span>}
                  </div>
                );
              })}
            </div>

            {stage !== 'upload' && (
              <button onClick={reset} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Start Over
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span>
            <div>
              {error}
              {accessMode === 'free' && freeCredits <= 0 && (
                <div className="mt-2">
                  <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-bold">
                    Get unlimited photos with ZenMux →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STAGE: UPLOAD ─── */}
        {stage === 'upload' && (
          <div>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                <span>📸</span> Step 1 of 3
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                Train Your Pet&apos;s<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                  Viral Identity
                </span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Upload photos. AI locks in their exact look — breed, markings, eye color, everything — before generating.
              </p>
            </div>

            <div className="max-w-sm mx-auto mb-8">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Pet Name (optional)</label>
              <input
                type="text"
                value={petName}
                onChange={e => setPetName(e.target.value)}
                placeholder="Biscuit, Mochi, Sir Fluffington..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {PHOTO_SLOTS.map((slot, i) => {
                const photo = photos[i];
                return (
                  <div
                    key={i}
                    className={`relative rounded-2xl border overflow-hidden transition-all ${i === 0 ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-zinc-950'}`}
                  >
                    {photo ? (
                      <div className="relative aspect-[4/3]">
                        <img src={photo.url} alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">{slot.label}</div>
                            {i === 0 && <div className="text-[10px] text-white/60 mt-0.5">Primary reference</div>}
                          </div>
                          <button onClick={() => removePhoto(i)} className="bg-black/60 hover:bg-black px-2.5 py-1 rounded-lg text-xs text-zinc-300 transition-all">
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[4/3] cursor-pointer group hover:bg-white/2 transition-all p-6 text-center">
                        <input
                          ref={el => { fileInputRefs.current[i] = el; }}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(i, f); }}
                        />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 transition-all ${i === 0 ? 'bg-purple-500/20 group-hover:bg-purple-500/30' : 'bg-white/5 group-hover:bg-white/10'}`}>+</div>
                        <div className="font-bold text-sm text-zinc-200 mb-1">{slot.label}</div>
                        <div className="text-xs text-zinc-500">{slot.hint}</div>
                        {slot.required && <div className="mt-2 text-[10px] text-purple-400 font-bold">REQUIRED</div>}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!primaryPhoto}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 transition-all text-lg"
            >
              {primaryPhoto ? `Analyze ${uploadedPhotos.length} Photo${uploadedPhotos.length > 1 ? 's' : ''} — Extract Identity →` : 'Upload at least one photo to continue'}
            </button>
          </div>
        )}

        {/* ─── STAGE: ANALYZING ─── */}
        {stage === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin opacity-20" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full bg-black flex items-center justify-center text-5xl">🔍</div>
            </div>
            <h2 className="text-2xl font-black mb-2">Reading Your Pet&apos;s Identity...</h2>
            <p className="text-zinc-400 max-w-md">Claude Vision is mapping breed, fur markings, eye color, and every unique trait so nothing gets lost in generation.</p>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {['Breed detection', 'Fur analysis', 'Identity lock', 'Profile build'].map((s, i) => (
                <div key={s} className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs px-3 py-1.5 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* ─── STAGE: PROFILE ─── */}
        {stage === 'profile' && profile && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <span>✓</span> Identity Locked
              </div>
              <h2 className="text-3xl font-black mb-2">
                {profile.petName !== 'Unknown' ? profile.petName : 'Your Pet'}&apos;s Viral Identity Profile
              </h2>
              <p className="text-zinc-400">These traits will be preserved in every generated image.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mb-8">
              {primaryPhoto && (
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                  <img src={primaryPhoto.url} alt="Primary reference" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Identity Reference</div>
                    <div className="font-black text-lg">{profile.petName !== 'Unknown' ? profile.petName : 'Your Pet'}</div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ProfileChip label="Species" value={profile.species} />
                  <ProfileChip label="Breed" value={profile.breedEstimate} />
                  <ProfileChip label="Eye Color" value={profile.eyeColor} />
                  <ProfileChip label="Ear Shape" value={profile.earShape} />
                  <ProfileChip label="Build" value={profile.sizeAndBuild} />
                  <ProfileChip label="Expression" value={profile.expression} />
                </div>

                <div className="bg-zinc-950 border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Fur Colors & Markings</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.furColors?.map((c, i) => (
                      <span key={i} className="bg-white/5 text-zinc-200 text-xs px-2.5 py-1 rounded-full border border-white/5">{c}</span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400">{profile.markings}</p>
                </div>

                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-2">Must Never Change</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.mustNeverChange?.map((t, i) => (
                      <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-500/20">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setStage('style')} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.01] transition-all text-lg">
              Choose Viral Style →
            </button>
          </div>
        )}

        {/* ─── STAGE: STYLE ─── */}
        {stage === 'style' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <span>🎨</span> Step 2 of 3
              </div>
              <h2 className="text-3xl font-black mb-2">
                Pick {profile?.petName && profile.petName !== 'Unknown' ? `${profile.petName}'s` : 'Their'} Viral Angle
              </h2>
              <p className="text-zinc-400">Choose the style. Identity stays locked.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {VIRAL_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${selectedStyle === style.id ? 'border-pink-500/60 bg-pink-500/5' : 'border-white/5 bg-zinc-950 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{style.emoji}</span>
                    <span className="font-bold text-sm">{style.label}</span>
                  </div>
                  <div className="text-xs text-zinc-500 leading-snug">{style.desc}</div>
                </button>
              ))}
            </div>

            {selectedStyle && (
              <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-4 mb-6 flex items-center gap-4">
                <span className="text-3xl">{selectedStyleMeta?.emoji}</span>
                <div>
                  <div className="font-black">{selectedStyleMeta?.label}</div>
                  <div className="text-sm text-zinc-400">{selectedStyleMeta?.desc}</div>
                </div>
              </div>
            )}

            {/* Free credits warning */}
            {accessMode === 'free' && freeCredits <= 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-bold text-yellow-300 text-sm">No free credits remaining</div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Refer a friend to earn $5 credit, or{' '}
                    <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">connect your ZenMux account</a> for unlimited photos.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selectedStyle || (accessMode === 'free' && freeCredits <= 0)}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100 transition-all text-lg"
            >
              {!selectedStyle
                ? 'Select a style to continue'
                : accessMode === 'free' && freeCredits <= 0
                ? 'No credits — refer a friend or connect ZenMux'
                : `Generate ${selectedStyleMeta?.label} →`}
            </button>
          </div>
        )}

        {/* ─── STAGE: GENERATING ─── */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-red-500 animate-spin opacity-20" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full bg-black flex items-center justify-center text-5xl">{selectedStyleMeta?.emoji || '✨'}</div>
            </div>
            <h2 className="text-2xl font-black mb-2">Generating {selectedStyleMeta?.label}...</h2>
            <p className="text-zinc-400 max-w-md">
              {resolvedKey ? 'Running through ZenMux →' : 'Running through OpenAI →'} Preserving every detail that makes your pet them.
            </p>
          </div>
        )}

        {/* ─── STAGE: RESULT ─── */}
        {stage === 'result' && resultUrl && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <span>🔥</span> That is absolutely your pet
              </div>
              <h2 className="text-3xl font-black">
                {profile?.petName && profile.petName !== 'Unknown' ? profile.petName : 'Your Pet'} as {selectedStyleMeta?.label}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Generated image */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
                <img src={resultUrl} alt="Generated viral pet photo" className="w-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4">
                  <div className="text-xs font-mono text-pink-300 mb-1">{selectedStyleMeta?.emoji} {selectedStyleMeta?.label}</div>
                  <div className="font-black text-xl">{resultCaption}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                {primaryPhoto && (
                  <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold p-3 pb-0">Original Reference</div>
                    <img src={primaryPhoto.url} alt="Original" className="w-full max-h-44 object-cover" />
                  </div>
                )}

                {/* Download + share buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = resultUrl;
                      a.download = `${profile?.petName || 'pet'}-${selectedStyle}.png`;
                      a.click();
                    }}
                    className="bg-white text-black font-black py-3 rounded-xl hover:bg-zinc-200 transition-all text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setShowShare(!showShare)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-3 rounded-xl hover:opacity-90 transition-all text-sm shadow-lg shadow-purple-500/30"
                  >
                    Share & Earn $5
                  </button>
                </div>

                {/* Credits status */}
                {accessMode === 'free' && (
                  <div className={`rounded-xl p-3 border text-sm flex items-center gap-2 ${freeCredits > 0 ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400'}`}>
                    {freeCredits > 0 ? (
                      <><span>✓</span> {freeCredits} free photo{freeCredits !== 1 ? 's' : ''} remaining</>
                    ) : (
                      <><span>💡</span> Refer a friend to earn more credits — or <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="underline font-bold">go unlimited with ZenMux</a></>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Share panel */}
            {showShare && (
              <div className="mb-6">
                <SharePanel
                  petName={profile?.petName || ''}
                  styleName={selectedStyleMeta?.label || selectedStyle}
                  savedReferral={savedReferral}
                  onSaveReferral={(link) => setSavedReferral(link)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStage('style')} className="bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-300 font-bold py-3 rounded-xl transition-all text-sm">
                Try Another Style
              </button>
              <button onClick={reset} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm shadow-lg shadow-purple-500/30">
                New Pet Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{label}</div>
      <div className="text-sm font-bold text-zinc-200 leading-tight">{value || '—'}</div>
    </div>
  );
}
