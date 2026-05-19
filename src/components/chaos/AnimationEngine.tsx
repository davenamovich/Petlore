'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadGallery, loadPetCharacter, savePetCharacter, clearPetCharacter,
  loadEpisodes, saveEpisode, clearEpisodes,
  type SavedPhoto, type PetCharacter, type Episode, type EpisodeScene,
} from '@/lib/pet-storage';

// ─── AES-GCM crypto (ZenMux key storage) ─────────────────────────────────────

const STORAGE_KEY    = 'pae_k';
const REFERRAL_KEY   = 'pae_ref';
const FREE_KEY       = 'pae_free_creations';
const APP_SALT       = 'petlore-animation-engine-v1';
const ZENMUX_SIGNUP  = 'https://zenmux.ai/invite/4E9SOE';
const ZENMUX_PLATFORM = 'https://zenmux.ai/platform';

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function encryptKey(pt: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(APP_SALT, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(pt));
  const buf  = new Uint8Array(salt.byteLength + iv.byteLength + ct.byteLength);
  buf.set(salt, 0); buf.set(iv, 16); buf.set(new Uint8Array(ct), 28);
  return btoa(String.fromCharCode(...buf));
}
async function decryptKey(blob: string): Promise<string> {
  const buf  = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
  const salt = buf.slice(0, 16); const iv = buf.slice(16, 28); const ct = buf.slice(28);
  const key  = await deriveKey(APP_SALT, salt);
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AccessMode = 'locked' | 'free' | 'byok';
type Tab = 'pet' | 'episodes' | 'current' | 'prompts' | 'social' | 'refer';

// ─── Pet Setup Flow ───────────────────────────────────────────────────────────

const PERSONALITY_OPTIONS = [
  { id: 'chaotic_good',   label: 'Chaotic Good',      desc: 'Means well, causes disasters' },
  { id: 'dramatic',       label: 'Overly Dramatic',   desc: 'Every situation is a crisis' },
  { id: 'secretly_evil',  label: 'Secretly Evil',     desc: 'Plotting something. Always.' },
  { id: 'dumb_confident', label: 'Dumb Confident',    desc: 'Zero self-awareness, maximum swagger' },
  { id: 'anxious_hero',   label: 'Anxious Hero',      desc: 'Terrified but showing up anyway' },
  { id: 'wise_idiot',     label: 'The Wise Idiot',    desc: 'Profound observations, terrible decisions' },
];

const FLAW_OPTIONS = [
  'Cannot resist investigating suspicious sounds',
  'Convinced they are smarter than everyone else',
  'Absolutely refuses to ask for help',
  'Cannot walk past a mirror without stopping',
  'Gets distracted by the worst possible things at the worst possible times',
  'Catastrophically bad at keeping secrets',
  'Immediately trusts every stranger',
  'Naps through every emergency',
];

function PetSetupFlow({
  onSave,
  gallery,
}: {
  onSave: (char: PetCharacter) => void;
  gallery: SavedPhoto[];
}) {
  const [step, setStep] = useState<'photo' | 'details'>('photo');
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhoto | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    species: '',
    breed: '',
    personality: '',
    flaw: '',
    catchphrase: '',
  });

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) return;
    try {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          URL.revokeObjectURL(url);
          setUploadedUrl(reader.result as string);
        };
        reader.onerror = () => URL.revokeObjectURL(url);
        reader.readAsDataURL(file);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('Error loading image object URL');
      };
      image.src = url;
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }

  function handleSave() {
    const photoUrl = selectedPhoto?.url || uploadedUrl || null;
    const profile = selectedPhoto?.profile as Record<string, unknown> | null ?? null;

    onSave({
      name:        form.name.trim() || 'My Pet',
      species:     form.species.trim() || profile?.species as string || '',
      breed:       form.breed.trim()   || profile?.breedEstimate as string || '',
      personality: form.personality,
      flaw:        form.flaw,
      catchphrase: form.catchphrase.trim() || `"${form.name || 'My Pet'} does not negotiate."`,
      photoUrl,
      furColors:   (profile?.furColors as string[]) || [],
      eyeColor:    profile?.eyeColor as string || '',
      markings:    profile?.markings as string || '',
    });
  }

  const photoUrl = selectedPhoto?.url || uploadedUrl;
  const canProceed = !!photoUrl || gallery.length === 0;
  const canSave    = form.name && form.personality && form.flaw;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-3xl font-black mb-2">Create Your Pet&apos;s Series</h2>
        <p className="text-zinc-400">
          Your pet becomes the star of an ongoing story — new episodes, cliffhangers, and social content built around them.
        </p>
      </div>

      {/* Step: Photo */}
      {step === 'photo' && (
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-4">Step 1 — Choose your pet&apos;s reference photo</div>

          {gallery.length > 0 && (
            <>
              <div className="text-sm text-zinc-400 mb-3">From your saved gallery:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {gallery.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedPhoto?.id === photo.id ? 'border-purple-500 scale-[1.02]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img src={photo.url} alt={photo.petName} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2">
                      <div className="text-[10px] font-bold text-white truncate">{photo.petName || 'Unnamed'}</div>
                      <div className="text-[9px] text-purple-300 truncate">{photo.styleLabel}</div>
                    </div>
                    {selectedPhoto?.id === photo.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                    )}
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-500 text-center mb-4">— or upload a new photo —</div>
            </>
          )}

          <label className={`flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed cursor-pointer transition-all ${uploadedUrl ? 'border-purple-500/50' : 'border-white/10 hover:border-purple-500/30'}`}>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            {uploadedUrl ? (
              <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <div className="text-center p-8">
                <div className="text-4xl mb-3">📸</div>
                <div className="font-bold text-zinc-200">Upload a photo of your pet</div>
                <div className="text-xs text-zinc-500 mt-1">Used to describe them to the AI</div>
              </div>
            )}
          </label>

          <button
            onClick={() => setStep('details')}
            disabled={!canProceed && gallery.length > 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:opacity-90 disabled:opacity-30 transition-all"
          >
            {photoUrl ? 'Continue with this photo →' : gallery.length === 0 ? 'Skip photo & continue →' : 'Select a photo to continue'}
          </button>
        </div>
      )}

      {/* Step: Details */}
      {step === 'details' && (
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-wider text-purple-400 font-bold">Step 2 — Build their character</div>

          {photoUrl && (
            <div className="flex items-center gap-4 bg-zinc-950 border border-white/5 rounded-xl p-3">
              <img src={photoUrl} alt="Pet" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 mb-1">Your star</div>
                <div className="font-bold text-white">{selectedPhoto?.petName || 'Your Pet'}</div>
              </div>
              <button onClick={() => setStep('photo')} className="ml-auto text-xs text-zinc-500 hover:text-white">Change</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Pet Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Biscuit, Mochi, Gary..." className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Species</label>
              <input value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} placeholder="Dog, Cat, Rabbit..." className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Breed</label>
              <input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="Golden Retriever, Tuxedo Cat..." className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 block">Catchphrase</label>
              <input value={form.catchphrase} onChange={e => setForm(f => ({ ...f, catchphrase: e.target.value }))} placeholder={`"${form.name || 'My Pet'} doesn't negotiate."`} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 block">Personality *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERSONALITY_OPTIONS.map(p => (
                <button key={p.id} onClick={() => setForm(f => ({ ...f, personality: p.id === f.personality ? '' : p.id }))}
                  className={`text-left p-3 rounded-xl border transition-all ${form.personality === p.id ? 'border-purple-500/60 bg-purple-500/5' : 'border-white/5 bg-zinc-950 hover:border-white/10'}`}>
                  <div className="font-bold text-sm">{p.label}</div>
                  <div className="text-xs text-zinc-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 block">Their Defining Flaw * <span className="text-zinc-600 normal-case font-normal">(drives every episode)</span></label>
            <div className="space-y-2">
              {FLAW_OPTIONS.map(flaw => (
                <button key={flaw} onClick={() => setForm(f => ({ ...f, flaw: flaw === f.flaw ? '' : flaw }))}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${form.flaw === flaw ? 'border-pink-500/60 bg-pink-500/5 text-white' : 'border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/10 hover:text-zinc-200'}`}>
                  {flaw}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('photo')} className="bg-zinc-900 border border-white/5 text-zinc-400 font-bold py-3 px-6 rounded-xl transition-all hover:text-white">
              Back
            </button>
            <button onClick={handleSave} disabled={!canSave}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:opacity-90 disabled:opacity-30 transition-all">
              Create {form.name || 'My Pet'}&apos;s Series →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Episode Card ─────────────────────────────────────────────────────────────

function EpisodeCard({
  episode,
  isCurrent,
  onSelect,
}: {
  episode: Episode;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className={`w-full text-left p-5 rounded-2xl border transition-all ${isCurrent ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/5 bg-zinc-950 hover:border-white/10'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">EP {episode.episode}</span>
            {isCurrent && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">CURRENT</span>}
          </div>
          <div className="font-black text-white truncate">{episode.title}</div>
          <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{episode.premise}</div>
        </div>
        <div className="text-xs text-zinc-600 flex-shrink-0">
          {new Date(episode.createdAt).toLocaleDateString()}
        </div>
      </div>
      {episode.cliffhanger && (
        <div className="mt-3 text-xs text-orange-400 italic border-t border-white/5 pt-3">
          🔥 {episode.cliffhanger}
        </div>
      )}
    </button>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all text-white whitespace-nowrap">
      {copied ? '✓ Copied' : (label || '📋 Copy')}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnimationEngine({ onBack }: { onBack: () => void }) {
  // ── ZenMux gate ──────────────────────────────────────────────────────────────
  const [unlocked, setUnlocked]       = useState(false);
  const [accessMode, setAccessMode]   = useState<AccessMode>('locked');
  const [balance, setBalance]         = useState<number | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [verifying, setVerifying]     = useState(false);
  const [gateError, setGateError]     = useState<string | null>(null);
  const [freeCreations, setFreeCreations] = useState(0);
  const [gateReferralInput, setGateReferralInput] = useState('');
  const [savedReferral, setSavedReferral] = useState<string | null>(null);
  const [referralInput, setReferralInput] = useState('');
  const [refCopied, setRefCopied]     = useState(false);

  // ── App state ────────────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState<Tab>('pet');
  const [petChar, setPetChar]         = useState<PetCharacter | null>(null);
  const [gallery, setGallery]         = useState<SavedPhoto[]>([]);
  const [episodes, setEpisodes]       = useState<Episode[]>([]);
  const [currentEp, setCurrentEp]     = useState<Episode | null>(null);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');
  const [copiedKey, setCopiedKey]     = useState<string | null>(null);

  // ── Video generation (Vessel Studio) ─────────────────────────────────────────
  const [generatingTool, setGeneratingTool] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{
    jobId: string; provider: string; modelId: string; status: string;
    progress?: number; resultUrl?: string; error?: string;
    statusUrlRaw?: string; resultUrlRaw?: string;
  } | null>(null);

  // ── On mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setGallery(loadGallery());
    setPetChar(loadPetCharacter());
    const eps = loadEpisodes();
    setEpisodes(eps);
    if (eps.length > 0) setCurrentEp(eps[eps.length - 1]);

    const freeCnt = parseInt(localStorage.getItem(FREE_KEY) || '0', 10);
    const ref = localStorage.getItem(REFERRAL_KEY);
    if (ref) setSavedReferral(ref);

    const blob = localStorage.getItem(STORAGE_KEY);
    if (blob) {
      decryptKey(blob).then(raw => verify(raw, true)).catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        if (freeCnt > 0) { setFreeCreations(freeCnt); setUnlocked(true); setAccessMode('free'); }
      });
    } else if (freeCnt > 0) {
      setFreeCreations(freeCnt); setUnlocked(true); setAccessMode('free');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ZenMux auth ──────────────────────────────────────────────────────────────
  async function verify(key: string, silent = false) {
    if (!silent) setVerifying(true);
    setGateError(null);
    try {
      const res  = await fetch('/api/chaos/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) });
      const data = await res.json();
      if (data.valid) {
        setBalance(data.balance);
        setUnlocked(true);
        setAccessMode('byok');
        const enc = await encryptKey(key);
        localStorage.setItem(STORAGE_KEY, enc);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        if (!silent) setGateError(data.error || 'Verification failed.');
        if (freeCreations > 0) { setUnlocked(true); setAccessMode('free'); }
        else setUnlocked(false);
      }
    } catch {
      if (!silent) setGateError('Network error — could not reach ZenMux.');
    } finally {
      if (!silent) setVerifying(false);
    }
  }

  function handleClaimFree() {
    const clean = gateReferralInput.trim();
    if (!clean) { setGateError('Paste your ZenMux referral link first.'); return; }
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url); setSavedReferral(url);
    localStorage.setItem(FREE_KEY, '1'); setFreeCreations(1);
    setUnlocked(true); setAccessMode('free'); setGateError(null);
  }

  function saveReferral() {
    const clean = referralInput.trim(); if (!clean) return;
    const url = clean.startsWith('http') ? clean : `https://zenmux.ai/invite/${clean}`;
    localStorage.setItem(REFERRAL_KEY, url); setSavedReferral(url); setReferralInput('');
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false); setBalance(null); setApiKeyInput(''); setAccessMode('locked');
  }

  // ── Pet character ─────────────────────────────────────────────────────────────
  function handleSavePet(char: PetCharacter) {
    savePetCharacter(char); setPetChar(char); setTab('episodes');
  }

  function handleResetPet() {
    if (!confirm(`Reset ${petChar?.name}'s character and all episodes? This cannot be undone.`)) return;
    clearPetCharacter(); clearEpisodes();
    setPetChar(null); setEpisodes([]); setCurrentEp(null); setTab('pet');
  }

  // ── Episode generation ────────────────────────────────────────────────────────
  async function generateNextEpisode() {
    if (!petChar) return;
    setGenerating(true); setGenError('');
    const episodeNumber = episodes.length + 1;
    try {
      const res = await fetch('/api/chaos/pet-lore/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petCharacter: petChar,
          previousEpisodes: episodes.map(e => ({ episode: e.episode, title: e.title, premise: e.premise, cliffhanger: e.cliffhanger })),
          episodeNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      const ep: Episode = data.episode;
      saveEpisode(ep);
      setEpisodes(prev => { const next = [...prev.filter(e => e.episode !== ep.episode), ep].sort((a, b) => a.episode - b.episode); return next; });
      setCurrentEp(ep); setTab('current');
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate episode');
    } finally {
      setGenerating(false);
    }
  }

  // ── Video generation (Vessel Studio) ─────────────────────────────────────────
  async function renderVideo(toolKey: 'veo' | 'kling' | 'runway') {
    if (generatingTool || !currentEp) return;
    setGeneratingTool(toolKey); setActiveJob(null);
    const prompt = currentEp.videoPrompts.main;
    try {
      const res = await fetch('/api/chaos/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, durationSeconds: 8, aspectRatio: '9:16', resolution: '1080p', generateAudio: true, forceModelId: 'seedance-1.5-pro', forceProvider: 'zenmux' }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`Generation failed: ${data.error}`); setGeneratingTool(null); return; }
      const jobId    = data.jobId || `mock_${Date.now()}`;
      const provider = data.provider || 'zenmux';
      const modelId  = data.modelId || 'seedance-1.5-pro';
      setActiveJob({ jobId, provider, modelId, status: 'queued', statusUrlRaw: data.statusUrlRaw, resultUrlRaw: data.resultUrlRaw });
      pollJob(jobId, provider, modelId, data.statusUrlRaw, data.resultUrlRaw);
    } catch { alert('Network error: could not reach Vessel Video Studio.'); setGeneratingTool(null); }
  }

  function pollJob(jobId: string, provider: string, modelId: string, statusUrl?: string, resultUrl?: string) {
    const iv = setInterval(async () => {
      try {
        let url = `/api/chaos/video/status?jobId=${encodeURIComponent(jobId)}&provider=${encodeURIComponent(provider)}&modelId=${encodeURIComponent(modelId)}`;
        if (statusUrl) url += `&statusUrl=${encodeURIComponent(statusUrl)}`;
        if (resultUrl) url += `&resultUrl=${encodeURIComponent(resultUrl)}`;
        const res  = await fetch(url); if (!res.ok) return;
        const data = await res.json();
        setActiveJob(prev => prev ? { ...prev, status: data.status, progress: data.progress ?? prev.progress, resultUrl: data.resultUrl, error: data.error } : null);
        if (data.status === 'completed' || data.status === 'failed') { clearInterval(iv); setGeneratingTool(null); }
      } catch { /* keep polling */ }
    }, 3000);
  }

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  // ─── GATE SCREEN ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold flex items-center gap-2"><span>🎬</span> PETLORE ANIMATION ENGINE</span>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-500 flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/40 mb-4">🎬</div>
              <h1 className="text-3xl font-black mb-2">Pet Story Engine</h1>
              <p className="text-zinc-400 text-sm">Your pet as the star of a serialized story — new episodes, cliffhangers, and social content.</p>
            </div>

            <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-5 border border-orange-500/30">
              <div className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-3 font-bold">⭐ Free Access — Save your ZenMux link</div>
              <input type="text" value={gateReferralInput} onChange={e => setGateReferralInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleClaimFree()} placeholder="https://zenmux.ai/invite/YOURCODE" className="w-full bg-black/70 border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/80 font-mono mb-3" />
              <button onClick={handleClaimFree} disabled={!gateReferralInput.trim()} className="w-full bg-gradient-to-r from-orange-500 to-red-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all hover:scale-[1.01]">
                Save Link & Unlock Studio
              </button>
              <div className="mt-2 text-center"><a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">Get your free ZenMux account & referral link →</a></div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">⚡ Unlimited — ZenMux API Key</div>
              <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && apiKeyInput && verify(apiKeyInput)} placeholder="zenmux-..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 font-mono" />
              <button onClick={() => verify(apiKeyInput)} disabled={verifying || !apiKeyInput.trim()} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {verifying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : '⚡ Connect & Unlock'}
              </button>
              {gateError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">{gateError}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── UNLOCKED ─────────────────────────────────────────────────────────────────

  const allTabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'pet',      label: petChar ? `🐾 ${petChar.name}` : '🐾 My Pet' },
    { id: 'episodes', label: `📺 Episodes${episodes.length > 0 ? ` (${episodes.length})` : ''}` },
    { id: 'current',  label: '🎬 Current Episode', hidden: !currentEp },
    { id: 'prompts',  label: '🤖 Video Prompts', hidden: !currentEp },
    { id: 'social',   label: '📱 Social Pack', hidden: !currentEp },
    { id: 'refer',    label: '📤 Refer Friends' },
  ];
  const tabs = allTabs.filter(t => !t.hidden);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold flex items-center gap-2"><span>🎬</span> PETLORE ANIMATION ENGINE</span>
          </div>
          <div className="flex items-center gap-3">
            {accessMode === 'free' ? (
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">{freeCreations} free video left</span>
            ) : balance !== null ? (
              <span className="text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">${balance.toFixed(2)} credit</span>
            ) : null}
            <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-300 font-mono">lock</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* If no pet character yet — show setup */}
        {!petChar ? (
          <PetSetupFlow onSave={handleSavePet} gallery={gallery} />
        ) : (
          <>
            {/* Series header */}
            <div className="flex items-center gap-4 mb-6">
              {petChar.photoUrl ? (
                <img src={petChar.photoUrl} alt={petChar.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl flex-shrink-0">🐾</div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black">{petChar.name}&apos;s Story</h1>
                <p className="text-zinc-400 text-sm truncate">{petChar.species} · {petChar.flaw}</p>
              </div>
              {episodes.length > 0 && currentEp && (
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-zinc-500 font-mono">NOW ON</div>
                  <div className="font-bold text-white">Episode {currentEp.episode}</div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.id ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── TAB: PET CHARACTER ── */}
            {tab === 'pet' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="text-xs font-mono text-purple-400 uppercase tracking-widest">Identity</div>
                    {([['Name', petChar.name], ['Species', petChar.species], ['Breed', petChar.breed]] as [string,string][]).map(([k,v]) => v && (
                      <div key={k}><div className="text-[10px] text-zinc-500 uppercase tracking-wider">{k}</div><div className="text-sm text-white mt-0.5">{v}</div></div>
                    ))}
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="text-xs font-mono text-pink-400 uppercase tracking-widest">Character Engine</div>
                    <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider">Personality</div><div className="text-sm text-white mt-0.5">{PERSONALITY_OPTIONS.find(p => p.id === petChar.personality)?.label || petChar.personality}</div></div>
                    <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider">Defining Flaw</div><div className="text-sm text-white mt-0.5">{petChar.flaw}</div></div>
                    <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider">Catchphrase</div><div className="text-sm text-orange-300 italic mt-0.5">{petChar.catchphrase}</div></div>
                  </div>

                  {petChar.photoUrl && (
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden">
                      <img src={petChar.photoUrl} alt={petChar.name} className="w-full max-h-64 object-cover" />
                    </div>
                  )}

                  {(petChar.furColors.length > 0 || petChar.eyeColor) && (
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-3">
                      <div className="text-xs font-mono text-orange-400 uppercase tracking-widest">Appearance</div>
                      {petChar.furColors.length > 0 && (
                        <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Fur Colors</div>
                          <div className="flex flex-wrap gap-1">{petChar.furColors.map((c,i) => <span key={i} className="text-xs bg-white/5 text-zinc-200 px-2 py-0.5 rounded-full">{c}</span>)}</div>
                        </div>
                      )}
                      {petChar.eyeColor && <div><div className="text-[10px] text-zinc-500 uppercase tracking-wider">Eyes</div><div className="text-sm text-white mt-0.5">{petChar.eyeColor}</div></div>}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setPetChar(null); setTab('pet'); }} className="flex-1 bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-300 font-bold py-3 rounded-xl transition-all text-sm">
                    Edit Character Setup
                  </button>
                  <button onClick={handleResetPet} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 px-4 rounded-xl transition-all text-sm border border-red-500/20">
                    Reset & Start Over
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB: EPISODES ── */}
            {tab === 'episodes' && (
              <div className="space-y-4">
                {genError && <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">{genError}</div>}

                {episodes.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🎬</div>
                    <h3 className="text-2xl font-black mb-2">Episode 1 is waiting</h3>
                    <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                      Claude will write a full episode for {petChar.name} — scenes, dialogue, a cliffhanger, and ready-to-post social captions.
                    </p>
                    <button onClick={generateNextEpisode} disabled={generating}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black px-8 py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 mx-auto">
                      {generating ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Writing Episode 1...</> : '✨ Generate Episode 1 →'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {episodes.map(ep => (
                        <EpisodeCard key={ep.episode} episode={ep} isCurrent={currentEp?.episode === ep.episode}
                          onSelect={() => { setCurrentEp(ep); setTab('current'); }} />
                      ))}
                    </div>

                    <button onClick={generateNextEpisode} disabled={generating}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {generating
                        ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Writing Episode {episodes.length + 1}...</>
                        : `✨ Generate Episode ${episodes.length + 1}`}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: CURRENT EPISODE ── */}
            {tab === 'current' && currentEp && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 rounded-2xl p-5">
                  <div className="text-xs text-purple-400 font-mono uppercase tracking-widest mb-1">Episode {currentEp.episode}</div>
                  <h2 className="text-2xl font-black mb-2">{currentEp.title}</h2>
                  <p className="text-zinc-300 text-sm leading-relaxed">{currentEp.premise}</p>
                  {currentEp.cliffhanger && (
                    <div className="mt-4 border-t border-white/10 pt-4 text-sm text-orange-400 italic">
                      🔥 {currentEp.cliffhanger}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {(currentEp.scenes as EpisodeScene[]).map(scene => (
                    <div key={scene.n} className="bg-zinc-950 border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center font-black text-purple-400">{scene.n}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{scene.dur}s</span>
                            <span className="text-xs text-zinc-400">{scene.setting}</span>
                            <span className="text-xs text-zinc-600 italic">{scene.cam}</span>
                          </div>
                          <p className="text-sm text-white mb-2">{scene.action}</p>
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-purple-200 italic mb-2">{scene.dialogue}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1.5"><span className="text-yellow-400">🎭</span> {scene.gag}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {episodes.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {episodes.map(ep => (
                      <button key={ep.episode} onClick={() => setCurrentEp(ep)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentEp.episode === ep.episode ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>
                        Ep {ep.episode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: VIDEO PROMPTS ── */}
            {tab === 'prompts' && currentEp && (
              <div className="space-y-6">
                {activeJob && (
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping" />
                        <span className="text-sm font-bold text-purple-300">Vessel Studio · {activeJob.provider}</span>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-mono font-black uppercase ${activeJob.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/40' : activeJob.status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'}`}>
                        {activeJob.status}{activeJob.progress != null && activeJob.status !== 'completed' ? ` (${activeJob.progress}%)` : ''}
                      </span>
                    </div>
                    {activeJob.resultUrl && (
                      <video src={activeJob.resultUrl} controls autoPlay loop playsInline className="w-full max-h-96 rounded-xl border border-white/10 bg-black" />
                    )}
                  </div>
                )}

                {(['veo', 'kling', 'runway'] as const).map(tool => {
                  const meta = { veo: { label: 'Google Veo', color: 'from-blue-500 to-cyan-500' }, kling: { label: 'Kling AI', color: 'from-pink-500 to-rose-500' }, runway: { label: 'Runway / Seedance', color: 'from-violet-500 to-purple-500' } }[tool];
                  return (
                    <div key={tool} className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <span className={`text-sm font-black bg-gradient-to-r ${meta.color} bg-clip-text text-transparent`}>{meta.label}</span>
                        <div className="flex gap-2">
                          <button onClick={() => renderVideo(tool)} disabled={generatingTool !== null}
                            className="text-xs font-black bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50 px-4 py-2 rounded-xl text-white flex items-center gap-1.5 transition-all">
                            {generatingTool === tool ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Rendering...</> : '🎬 Render (Vessel Studio)'}
                          </button>
                          <CopyBtn text={currentEp.videoPrompts.main} label={copiedKey === tool ? '✓ Copied' : '📋 Copy'} />
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300 bg-black/30 rounded-xl p-4 font-mono leading-relaxed">{currentEp.videoPrompts.main}</p>
                    </div>
                  );
                })}

                <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-orange-400 uppercase tracking-widest">Thumbnail Prompt</span>
                    <CopyBtn text={currentEp.videoPrompts.thumbnail} />
                  </div>
                  <p className="text-sm text-zinc-300 bg-black/30 rounded-xl p-4 font-mono">{currentEp.videoPrompts.thumbnail}</p>
                </div>
              </div>
            )}

            {/* ── TAB: SOCIAL PACK ── */}
            {tab === 'social' && currentEp && (
              <div className="space-y-4">
                {[
                  { key: 'caption',  label: 'Post Caption',         emoji: '📱', text: currentEp.socialCaption },
                  { key: 'teaser',   label: 'Next Episode Teaser',  emoji: '🔮', text: currentEp.nextEpisodeTeaser },
                  { key: 'cliff',    label: 'Cliffhanger Drop',     emoji: '🔥', text: currentEp.cliffhanger },
                  { key: 'ep_title', label: 'Episode Title',        emoji: '🎬', text: `${petChar.name} EP ${currentEp.episode}: ${currentEp.title}` },
                ].map(item => (
                  <div key={item.key} className="bg-zinc-950 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                    <span className="text-2xl mt-0.5 flex-shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{item.label}</span>
                        <button onClick={() => copy(item.text, item.key)} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all text-white">
                          {copiedKey === item.key ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                      <p className="text-sm text-white">{item.text}</p>
                    </div>
                  </div>
                ))}

                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 text-sm">
                  <div className="font-bold text-white mb-1">📣 The posting loop</div>
                  <p className="text-zinc-400 text-xs">Post the episode → drop the cliffhanger in comments → tease episode {currentEp.episode + 1}. Viewers follow to see what happens. Build the next episode when they start asking.</p>
                </div>
              </div>
            )}

            {/* ── TAB: REFER FRIENDS ── */}
            {tab === 'refer' && (
              <div className="max-w-lg space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-5">
                  <div className="font-black text-white mb-1">💰 ZenMux pays you $5 per referral</div>
                  <p className="text-zinc-400 text-sm">Share your ZenMux link. Friends who sign up through you earn you $5 — up to 10 referrals = $50. More Petlore earn programs coming soon.</p>
                </div>

                {savedReferral ? (
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Your Referral Link</div>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs text-purple-300 bg-black px-3 py-2 rounded-lg border border-white/5 truncate font-mono">{savedReferral}</code>
                      <button onClick={() => { navigator.clipboard.writeText(savedReferral); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }} className="bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">
                        {refCopied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-2">Track earnings at <a href={ZENMUX_PLATFORM} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zenmux.ai/platform</a></p>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-purple-500/20 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-2">Save Your ZenMux Referral Link</div>
                    <div className="flex gap-2">
                      <input value={referralInput} onChange={e => setReferralInput(e.target.value)} placeholder="https://zenmux.ai/invite/YOURCODE" className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      <button onClick={saveReferral} disabled={!referralInput.trim()} className="bg-purple-500 disabled:opacity-30 text-white text-xs font-bold px-3 py-2 rounded-lg">Save</button>
                    </div>
                    <a href={ZENMUX_SIGNUP} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-400 hover:underline mt-2 block">Get your link at ZenMux →</a>
                  </div>
                )}

                {savedReferral && (
                  <div className="bg-zinc-950 border border-white/5 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3">Ready-to-send message</div>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                      {`I've been building a serialized pet story with PetLore — it turns your pet's photos into AI-generated episodes with cliffhangers and social content. Try it free: ${savedReferral}`}
                    </p>
                    <button onClick={() => copy(`I've been building a serialized pet story with PetLore — it turns your pet's photos into AI-generated episodes with cliffhangers and social content. Try it free: ${savedReferral}`, 'share_msg')} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-all">
                      {copiedKey === 'share_msg' ? '✓ Copied' : '📋 Copy message'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
