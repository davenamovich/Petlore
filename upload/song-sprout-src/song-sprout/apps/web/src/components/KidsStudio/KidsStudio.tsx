// components/KidsStudio/KidsStudio.tsx
// Parent-facing UI for personalized children's songs with REAL AI lyrics generation.
// Two-stage flow:
//   1. Profile → generate 3 lyric variations (cheap, fast — ~$0.01 in API costs)
//   2. Pick favorite → generate music (expensive, slow — GPU time)
//
// This avoids burning GPU cycles on lyrics the parent doesn't love.

import React, { useState, useMemo } from 'react';
import {
  KIDS_SONG_TYPES,
  THEMES,
  VOICE_PRESETS,
  suggestPhonetic,
  nameConfidence,
} from '../../data/kidsPresets';
import {
  fullKidsSongPipeline,
  generateLyricsVariations,
  validateEditedLyrics,
  suggestedIntros,
  LyricsResponse,
} from '../../services/kidsGenerationService';

type Stage = 'profile' | 'pick-lyrics' | 'generating' | 'done';

export const KidsStudio: React.FC = () => {
  // ─── Child profile ──────────────────────────────────────────────────────
  const [childName, setChildName] = useState('');
  const [phoneticName, setPhoneticName] = useState('');
  const [usePhonetic, setUsePhonetic] = useState(false);
  const [age, setAge] = useState<number | ''>('');
  const [petName, setPetName] = useState('');
  const [interests, setInterests] = useState<string>('');

  // ─── Song selection ─────────────────────────────────────────────────────
  const [songTypeId, setSongTypeId] = useState<string>('lullaby_starry');
  const [themeId, setThemeId] = useState<string>('classic');
  const [voiceId, setVoiceId] = useState<string>('warm_female');

  // ─── Voice intro ────────────────────────────────────────────────────────
  const [withVoiceIntro, setWithVoiceIntro] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'grok'>('grok');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [introText, setIntroText] = useState('');

  const GROK_VOICES = [
    { id: 'ara', label: 'Ara (Energetic)' },
    { id: 'eve', label: 'Eve (Warm)' },
    { id: 'leo', label: 'Leo (Confident)' },
    { id: 'rex', label: 'Rex (Authoritative)' },
    { id: 'sal', label: 'Sal (Balanced)' },
  ];

  // ─── Two-stage flow state ──────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('profile');
  const [lyricsVariations, setLyricsVariations] = useState<LyricsResponse[]>([]);
  const [selectedLyricsIndex, setSelectedLyricsIndex] = useState<number>(0);
  const [editedLyrics, setEditedLyrics] = useState<string>('');
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);

  // ─── Generation state ───────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ mp3Url: string; wavUrl: string; lyrics: string; lyricsSource: 'ai' | 'template' } | null>(null);

  const selectedSongType = useMemo(
    () => KIDS_SONG_TYPES.find(t => t.id === songTypeId) || KIDS_SONG_TYPES[0],
    [songTypeId]
  );

  React.useEffect(() => {
    if (childName) setPhoneticName(suggestPhonetic(childName));
  }, [childName]);

  React.useEffect(() => {
    if (childName && !introText) {
      const suggestions = suggestedIntros(childName, selectedSongType.occasion);
      setIntroText(suggestions[0]);
    }
  }, [childName, selectedSongType.occasion]);

  const confidence = nameConfidence(childName);
  const effectiveName = usePhonetic ? phoneticName : childName;

  // ─── STAGE 1: Generate lyrics variations ────────────────────────────────
  const handleGenerateLyrics = async () => {
    if (!childName.trim()) {
      setError('Please enter the child\'s name first.');
      return;
    }
    setBusy(true);
    setError('');
    setProgress(`Writing 3 lyric variations for ${childName}...`);

    try {
      const interestsList = interests.split(',').map(s => s.trim()).filter(Boolean);
      const { variations } = await generateLyricsVariations(
        {
          name: effectiveName,
          age: age || undefined,

          interests: interestsList,
          petName: petName || undefined,
          songTypeId,
        },
        3
      );
      const valid = variations.filter(v => v.lyrics && !v.error);
      if (valid.length === 0) {
        setError('Lyrics generation failed. Try again or use template mode.');
        return;
      }
      setLyricsVariations(valid);
      setSelectedLyricsIndex(0);
      setEditedLyrics(valid[0].lyrics);
      setStage('pick-lyrics');
    } catch (err) {
      setError(`Lyrics generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  // ─── STAGE 2: Generate music from chosen lyrics ─────────────────────────
  const handleGenerateMusic = async () => {
    const finalLyrics = isEditingLyrics ? editedLyrics : lyricsVariations[selectedLyricsIndex]?.lyrics;
    if (!finalLyrics) {
      setError('No lyrics selected.');
      return;
    }
    setBusy(true);
    setError('');
    setStage('generating');

    try {
      const interestsList = interests.split(',').map(s => s.trim()).filter(Boolean);
      const final = await fullKidsSongPipeline(
        {
          songTypeId,
          params: {
            name: effectiveName,
            age: age || undefined,
  
            interests: interestsList,
            petName: petName || undefined,
          },
          themeId,
          voiceId,
          customLyrics: finalLyrics,
          withVoiceIntro,
          voiceIntroText: withVoiceIntro ? introText : undefined,
          ttsProvider,
          elevenLabsVoiceId: withVoiceIntro ? elevenLabsVoiceId : undefined,
        },
        setProgress
      );
      setResult({
        mp3Url: final.mp3Url,
        wavUrl: final.wavUrl,
        lyrics: final.lyrics,
        lyricsSource: lyricsVariations[selectedLyricsIndex]?.source || 'ai',
      });
      setStage('done');
    } catch (err) {
      setError(`Music generation failed: ${err instanceof Error ? err.message : String(err)}`);
      setStage('pick-lyrics');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const handleStartOver = () => {
    setStage('profile');
    setLyricsVariations([]);
    setResult(null);
    setError('');
    setProgress('');
    setIsEditingLyrics(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-mono">
            VESSEL · KIDS STUDIO
          </div>
          <h1 className="text-3xl font-medium mb-2">A song with their name in it.</h1>
          <p className="text-sm text-zinc-400">
            AI writes fresh lyrics about your child. AI composes the music. Generated on your
            machine, downloaded directly to you. No accounts, no profiles.
          </p>
        </div>

        {/* Stage indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs font-mono">
          <StageBadge active={stage === 'profile'} done={stage !== 'profile'} num="01" label="Profile" />
          <div className="h-px flex-1 bg-zinc-800" />
          <StageBadge active={stage === 'pick-lyrics'} done={stage === 'generating' || stage === 'done'} num="02" label="Pick lyrics" />
          <div className="h-px flex-1 bg-zinc-800" />
          <StageBadge active={stage === 'generating'} done={stage === 'done'} num="03" label="Music" />
          <div className="h-px flex-1 bg-zinc-800" />
          <StageBadge active={stage === 'done'} done={false} num="04" label="Yours" />
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-300 px-4 py-3 rounded-md text-sm mb-6">
            {error}
          </div>
        )}

        {/* ─── STAGE 1: PROFILE ─── */}
        {stage === 'profile' && (
          <>
            <Section number="01" title="Who is the song for?">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Field label="Child's name *">
                  <input
                    type="text"
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    placeholder="Sophie"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                  />
                  {childName && confidence !== 'high' && (
                    <NameConfidenceHint
                      confidence={confidence}
                      phonetic={phoneticName}
                      usePhonetic={usePhonetic}
                      onToggle={() => setUsePhonetic(!usePhonetic)}
                      onEditPhonetic={setPhoneticName}
                    />
                  )}
                </Field>

                <Field label="Age (optional)">
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value ? Number(e.target.value) : '')}
                    placeholder="5"
                    min={0}
                    max={12}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                  />
                </Field>



                <Field label="Pet's name (optional)">
                  <input
                    type="text"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="Buddy"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Things they love (comma-separated, optional)">
                    <input
                      type="text"
                      value={interests}
                      onChange={e => setInterests(e.target.value)}
                      placeholder="dinosaurs, drawing, the color purple"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      The AI songwriter weaves these into the lyrics. Three or four is usually enough.
                    </p>
                  </Field>
                </div>
              </div>
            </Section>

            <Section number="02" title="What kind of song?">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {KIDS_SONG_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSongTypeId(t.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      songTypeId === t.id
                        ? 'border-amber-500/60 bg-amber-500/5'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                        {t.ageRange}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 leading-snug">{t.description}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section number="03" title="Style and voice">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Theme">
                  <select
                    value={themeId}
                    onChange={e => setThemeId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                  >
                    {THEMES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Singer voice">
                  <select
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                  >
                    {VOICE_PRESETS.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section number="04" title="Optional: spoken voice intro" subtitle="Have the song open with a spoken intro using ElevenLabs.">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={withVoiceIntro}
                  onChange={e => setWithVoiceIntro(e.target.checked)}
                  className="accent-amber-500"
                />
                <span className="text-sm">Add a spoken intro before the song</span>
              </label>

              {withVoiceIntro && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Voice provider">
                      <select
                        value={ttsProvider}
                        onChange={e => {
                          const p = e.target.value as 'elevenlabs' | 'grok';
                          setTtsProvider(p);
                          if (p === 'grok') setElevenLabsVoiceId('ara');
                          else setElevenLabsVoiceId('');
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="grok">Grok Voice (xAI)</option>
                        <option value="elevenlabs">ElevenLabs</option>
                      </select>
                    </Field>

                    <Field label={ttsProvider === 'grok' ? 'Grok Voice' : 'ElevenLabs Voice ID'}>
                      {ttsProvider === 'grok' ? (
                        <select
                          value={elevenLabsVoiceId}
                          onChange={e => setElevenLabsVoiceId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                        >
                          {GROK_VOICES.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={elevenLabsVoiceId}
                          onChange={e => setElevenLabsVoiceId(e.target.value)}
                          placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm font-mono"
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="Intro line">
                    <select
                      value={introText}
                      onChange={e => setIntroText(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm"
                    >
                      {childName && suggestedIntros(childName, selectedSongType.occasion).map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </Section>

            <button
              onClick={handleGenerateLyrics}
              disabled={busy || !childName.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium px-4 py-3.5 rounded-md text-sm transition-colors"
            >
              {busy
                ? progress || 'Working...'
                : childName
                  ? `Write 3 lyric variations for ${childName} →`
                  : 'Write lyric variations'}
            </button>
            <p className="text-[11px] text-zinc-500 text-center mt-2">
              Costs ~$0.01 per round of variations. Music generation comes after.
            </p>
          </>
        )}

        {/* ─── STAGE 2: PICK LYRICS ─── */}
        {stage === 'pick-lyrics' && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-1">
                Pick your favorite for {childName}
              </h2>
              <p className="text-sm text-zinc-400">
                Each version is unique. Pick one, edit it if you want, then we'll compose the music.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {lyricsVariations.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedLyricsIndex(i);
                    setEditedLyrics(v.lyrics);
                    setIsEditingLyrics(false);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedLyricsIndex === i
                      ? 'border-amber-500/60 bg-amber-500/5'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Version {i + 1}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-zinc-500">
                        {v.validation?.nameCount}× {childName}
                      </span>
                      {v.source === 'ai' ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">AI-written</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">Template</span>
                      )}
                    </div>
                  </div>
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                    {v.lyrics}
                  </pre>
                </button>
              ))}
            </div>

            {/* Edit mode for the selected lyrics */}
            <div className="mb-6">
              {!isEditingLyrics ? (
                <button
                  onClick={() => setIsEditingLyrics(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline font-mono"
                >
                  Edit version {selectedLyricsIndex + 1} →
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-zinc-500 font-mono">EDIT MODE</div>
                    <button
                      onClick={() => {
                        setEditedLyrics(lyricsVariations[selectedLyricsIndex].lyrics);
                        setIsEditingLyrics(false);
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                    >
                      Reset
                    </button>
                  </div>
                  <textarea
                    value={editedLyrics}
                    onChange={e => setEditedLyrics(e.target.value)}
                    rows={16}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm font-mono text-zinc-100 leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleStartOver}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-3 rounded-md text-sm transition-colors"
              >
                ← Back to profile
              </button>
              <button
                onClick={handleGenerateLyrics}
                disabled={busy}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-3 rounded-md text-sm transition-colors"
              >
                Try 3 different versions
              </button>
              <button
                onClick={handleGenerateMusic}
                disabled={busy}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium px-4 py-3 rounded-md text-sm transition-colors"
              >
                Compose music with this →
              </button>
            </div>
          </>
        )}

        {/* ─── STAGE 3: GENERATING MUSIC ─── */}
        {stage === 'generating' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="inline-block w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <div className="text-sm text-zinc-300 mb-1">{progress || 'Composing music...'}</div>
            <div className="text-xs text-zinc-500 mt-3">
              This takes 1–3 minutes. The lyrics you picked are being set to music.
            </div>
          </div>
        )}

        {/* ─── STAGE 4: DONE ─── */}
        {stage === 'done' && result && (
          <div className="bg-zinc-900/50 border border-amber-500/20 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-amber-400 font-mono mb-1">
                  ✓ COMPLETE · {result.lyricsSource === 'ai' ? 'AI-WRITTEN LYRICS' : 'TEMPLATE LYRICS'}
                </div>
                <h2 className="text-xl font-medium">{childName}'s song is ready</h2>
              </div>
              <button
                onClick={handleStartOver}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
              >
                Make another →
              </button>
            </div>

            <audio controls src={result.mp3Url} className="w-full mb-4" />

            <div className="flex gap-2 mb-4">
              <a
                href={result.mp3Url}
                download
                className="flex-1 text-center bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium px-3 py-2 rounded-md text-sm transition-colors"
              >
                Download MP3
              </a>
              <a
                href={result.wavUrl}
                download
                className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-md text-sm transition-colors"
              >
                Download WAV
              </a>
            </div>

            <details className="text-xs">
              <summary className="text-zinc-400 cursor-pointer hover:text-zinc-200">
                View lyrics
              </summary>
              <pre className="mt-2 p-3 bg-zinc-950 rounded text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                {result.lyrics}
              </pre>
            </details>
          </div>
        )}

        {/* Footer note */}
        <div className="text-xs text-zinc-500 space-y-2 mt-10">
          <p>
            <strong className="text-zinc-400">How the lyrics get written:</strong> When you have an
            Anthropic API key in API Ring, the AI songwriter writes fresh, original lyrics for every
            song — incorporating your child's name, age, pet, and interests. Without a key, you get
            template lyrics with their name slotted in. Either way, the music is AI-generated.
          </p>
          <p>
            <strong className="text-zinc-400">Your data:</strong> The child's name and details never
            leave this machine. The lyrics are generated via an API call, the audio is generated
            locally, both download directly to you. No accounts, no profiles, no analytics.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────────────

const StageBadge: React.FC<{ active: boolean; done: boolean; num: string; label: string }> = ({
  active, done, num, label,
}) => (
  <div className={`flex items-center gap-2 ${active ? 'text-amber-400' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>
    <span className="text-[10px] tracking-widest">{num}</span>
    <span className="text-xs">{label}</span>
  </div>
);

const Section: React.FC<{
  number: string; title: string; subtitle?: string; children: React.ReactNode;
}> = ({ number, title, subtitle, children }) => (
  <div className="mb-6 pb-6 border-b border-zinc-800/50">
    <div className="flex items-baseline gap-3 mb-3">
      <span className="text-xs font-mono text-amber-400">{number}</span>
      <h2 className="text-sm font-medium">{title}</h2>
    </div>
    {subtitle && <p className="text-xs text-zinc-500 mb-3 -mt-1">{subtitle}</p>}
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs text-zinc-500 mb-1">{label}</div>
    {children}
  </div>
);

const NameConfidenceHint: React.FC<{
  confidence: 'high' | 'medium' | 'low';
  phonetic: string;
  usePhonetic: boolean;
  onToggle: () => void;
  onEditPhonetic: (v: string) => void;
}> = ({ confidence, phonetic, usePhonetic, onToggle, onEditPhonetic }) => {
  if (confidence === 'high') return null;
  return (
    <div className="mt-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs">
      <div className="text-amber-300 mb-1.5">
        {confidence === 'low'
          ? 'This name may need phonetic guidance for the singer.'
          : 'You can try the phonetic spelling if the first take sounds off.'}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={phonetic}
          onChange={e => onEditPhonetic(e.target.value)}
          placeholder="Phonetic spelling"
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono"
        />
        <label className="flex items-center gap-1 whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={usePhonetic}
            onChange={onToggle}
            className="accent-amber-500"
          />
          <span className="text-amber-300">Use</span>
        </label>
      </div>
    </div>
  );
};

export default KidsStudio;
