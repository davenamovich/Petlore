'use client';

import { useState } from 'react';
import { DEMO_SHOWS, DEMO_CLIPS, PODCAST_FORMATS } from '@/lib/demo-data';

type View = 'landing' | 'create' | 'clip_preview' | 'vet';

export default function PetloreHome() {
  const [view, setView] = useState<View>('landing');
  const [activeClip, setActiveClip] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const clip = DEMO_CLIPS[activeClip];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <span className="font-black text-lg tracking-tight">PETLORE</span>
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest ml-1">Podcast Agency</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <button onClick={() => setView('landing')} className="hover:text-white transition">Home</button>
            <button onClick={() => setView('clip_preview')} className="hover:text-white transition">Clips</button>
            <button onClick={() => setView('vet')} className="hover:text-white transition">For Vets</button>
            <button
              onClick={() => setView('create')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1.5 rounded-full font-semibold hover:opacity-90 transition"
            >
              Create Your Host
            </button>
          </div>
          {/* mobile */}
          <div className="flex md:hidden gap-2">
            <button onClick={() => setView('clip_preview')} className="text-xs text-white/50 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg">Clips</button>
            <button onClick={() => setView('create')} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold">Create</button>
          </div>
        </div>
      </nav>

      <div className="pt-14">

        {/* ════════════════════════════════ LANDING ════════════════════════════════ */}
        {view === 'landing' && (
          <>
            {/* HERO */}
            <section className="relative overflow-hidden px-4 pt-20 pb-24 text-center">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute top-40 left-1/4 w-64 h-64 rounded-full bg-pink-600/10 blur-[80px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-48 rounded-full bg-orange-600/10 blur-[80px]" />
              </div>
              <div className="relative max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  The Internet's First Pet Podcast Agency
                </div>
                <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
                  Your Pet's First<br />
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    Podcast Starts Here.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-3 leading-relaxed">
                  Upload your pet. We cartoonize them, build their podcast persona, scrape viral topics, write the clips, and help launch the show.
                </p>
                <p className="text-white/30 text-sm mb-10">Reddit-powered topics. Agent-written clips. Cartoon pet hosts.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setView('create')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-purple-900/40"
                  >
                    🐾 Create My Pet Host
                  </button>
                  <button
                    onClick={() => setView('clip_preview')}
                    className="bg-white/5 border border-white/20 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition"
                  >
                    🎬 See Example Clips
                  </button>
                </div>
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/30">
                  <span>🐕 7 demo shows</span>
                  <span className="hidden sm:block">·</span>
                  <span>🎙️ 10 generated clips</span>
                  <span className="hidden sm:block">·</span>
                  <span>🤖 9 AI agents</span>
                  <span className="hidden sm:block">·</span>
                  <span>🎬 animal-podcast v0.5.1 integrated</span>
                </div>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="px-4 py-20 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-3">How It Works</h2>
                <p className="text-white/50">Five steps from photo to podcast empire.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { step: '01', icon: '📸', title: 'Upload Pet Photo', desc: 'Any pet. Any breed. Any amount of attitude.' },
                  { step: '02', icon: '🎨', title: 'Create Cartoon Host', desc: 'Character bible generated with personality, catchphrases & visual style.' },
                  { step: '03', icon: '🎙️', title: 'Pick Podcast Format', desc: 'Comedy, gossip, advice, true crime — 12 formats.' },
                  { step: '04', icon: '📡', title: 'AI Scrapes Topics', desc: 'Agents pull Reddit threads, trending takes, and viral content.' },
                  { step: '05', icon: '🚀', title: 'Generate & Launch', desc: 'Scripts, clips, captions, thumbnails, promotional plan. Done.' },
                ].map((item) => (
                  <div key={item.step} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative">
                    <div className="text-xs font-mono text-purple-400 mb-2">{item.step}</div>
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="font-bold mb-1 text-sm">{item.title}</h3>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* EXAMPLE SHOWS */}
            <section className="px-4 py-20 border-y border-white/5">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-black mb-3">Example Shows</h2>
                  <p className="text-white/50">Every pet has a show in them. Here are seven.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEMO_SHOWS.map((show, i) => (
                    <button
                      key={show.id}
                      onClick={() => { setActiveClip(i > 9 ? 9 : i); setView('clip_preview'); }}
                      className={`bg-gradient-to-br ${show.color} p-px rounded-2xl group text-left`}
                    >
                      <div className="bg-[#0d0d14] rounded-2xl p-5 h-full">
                        <div className="text-4xl mb-3">{show.emoji}</div>
                        <div className="font-black text-base mb-1">{show.title}</div>
                        <div className="text-sm text-white/50 mb-3 line-clamp-2">{show.tagline}</div>
                        <div className="text-xs text-white/30 italic line-clamp-2">"{show.sampleClipHook}"</div>
                        <div className="mt-4 text-xs font-semibold text-purple-400 group-hover:text-purple-300 transition">See clips →</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* CLIP PREVIEW */}
            <section className="px-4 py-20 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-3">What a Clip Looks Like</h2>
                <p className="text-white/50">Every episode generates 5–10 short-form clips. Each is a structured JSON scene ready for the animal-podcast pipeline.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-bold">{DEMO_CLIPS[0].show_title}</span>
                    <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full">{DEMO_CLIPS[0].duration_seconds}s · {DEMO_CLIPS[0].aspect_ratio}</span>
                  </div>
                  <div className="text-xl font-black mb-4 leading-tight">"{DEMO_CLIPS[0].hook}"</div>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-white/40 text-xs block mb-1 uppercase tracking-wider">Setup</span><span className="text-white/70">{DEMO_CLIPS[0].setup}</span></div>
                    <div><span className="text-white/40 text-xs block mb-1 uppercase tracking-wider">The Take</span><span className="text-white/70">{DEMO_CLIPS[0].pet_take}</span></div>
                    <div><span className="text-white/40 text-xs block mb-1 uppercase tracking-wider">Punchline</span><span className="text-white font-semibold">{DEMO_CLIPS[0].punchline}</span></div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <div className="text-xs italic text-white/50 mb-2">{DEMO_CLIPS[0].caption}</div>
                    <div className="flex flex-wrap gap-1">
                      {DEMO_CLIPS[0].hashtags.slice(0, 5).map(h => (
                        <span key={h} className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-mono text-green-400">clip_001.json</span>
                    <button onClick={() => setJsonExpanded(!jsonExpanded)} className="text-xs text-white/40 hover:text-white/60 transition">
                      {jsonExpanded ? 'Show less' : 'Expand'}
                    </button>
                  </div>
                  <pre className={`bg-[#0d1117] border border-white/10 rounded-2xl p-4 text-xs font-mono text-green-300 overflow-auto ${jsonExpanded ? 'max-h-[600px]' : 'max-h-[280px]'} transition-all`}>
                    {JSON.stringify(DEMO_CLIPS[0], null, 2)}
                  </pre>
                  <button
                    onClick={() => setView('clip_preview')}
                    className="mt-4 w-full bg-white/5 border border-white/10 rounded-xl py-3 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Browse all 10 demo clips →
                  </button>
                </div>
              </div>
            </section>

            {/* AGENCY */}
            <section className="px-4 py-20 border-y border-white/5">
              <div className="max-w-4xl mx-auto text-center">
                <div className="text-5xl mb-6">🏢</div>
                <h2 className="text-3xl md:text-4xl font-black mb-4">Your pet becomes the face of a tiny media empire.</h2>
                <p className="text-white/50 text-lg mb-10 max-w-2xl mx-auto">
                  We help you turn your pet into a recurring content character with a real show, real clips, and a real audience.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {[
                    { icon: '🤖', label: '9 AI Agents', desc: 'Research, write, clip, promote' },
                    { icon: '📡', label: 'Reddit Scraping', desc: 'Topics from real trending posts' },
                    { icon: '🎬', label: 'Clip Generator', desc: '5–10 clips per episode' },
                    { icon: '🎭', label: 'animal-podcast', desc: 'Seedance 2.0 video pipeline' },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <div className="font-bold text-sm mb-1">{item.label}</div>
                      <div className="text-xs text-white/40">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setView('create')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:opacity-90 transition"
                >
                  Upload Your Pet. Launch Their Show. →
                </button>
              </div>
            </section>

            {/* VET TEASER */}
            <section className="px-4 py-16 max-w-6xl mx-auto">
              <div className="bg-gradient-to-r from-teal-900/40 to-blue-900/40 border border-teal-500/20 rounded-3xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">For Veterinary Clinics</div>
                    <h3 className="text-2xl md:text-3xl font-black mb-4">Every vet clinic should own a pet audience.</h3>
                    <p className="text-white/60 mb-6">
                      Petlore includes a full Vet Newsletter OS — automated content, seasonal health alerts, and cartoon pet hosts that drive appointment bookings.
                    </p>
                    <button onClick={() => setView('vet')} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-500 transition">
                      See the Vet System →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Weekly Newsletter', 'Dental Campaigns', 'Flea Season Alerts', 'Pet of the Month', 'TikTok Clips', 'Appointment CTAs'].map(item => (
                      <div key={item} className="bg-white/5 rounded-xl px-3 py-2 text-sm text-white/70 flex items-center gap-2">
                        <span className="text-teal-400">✓</span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* FINAL CTA */}
            <section className="px-4 py-24 text-center">
              <div className="max-w-3xl mx-auto">
                <p className="text-white/30 text-sm uppercase tracking-widest mb-4">You already know it's true</p>
                <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  Your pet already has a personality.<br />
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Now give them a microphone.
                  </span>
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/5 border border-white/20 rounded-xl px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 sm:w-72"
                  />
                  <button
                    onClick={() => { if (emailInput) setEmailSubmitted(true); }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition"
                  >
                    {emailSubmitted ? '✅ You\'re on the list!' : 'Get Early Access'}
                  </button>
                </div>
                <p className="text-white/20 text-xs mt-4">No spam. Just podcast drops and product updates.</p>
              </div>
            </section>
          </>
        )}

        {/* ════════════════════════════════ CREATE VIEW ════════════════════════════════ */}
        {view === 'create' && (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <button onClick={() => setView('landing')} className="text-white/40 hover:text-white text-sm mb-8 flex items-center gap-2 transition">← Back</button>
            <h2 className="text-4xl font-black mb-2">Create Your Pet Host</h2>
            <p className="text-white/50 mb-10">Upload a photo. Pick a vibe. Launch the show.</p>

            <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-3xl p-12 text-center mb-6 hover:border-purple-500/50 transition cursor-pointer">
              <div className="text-6xl mb-4">📸</div>
              <div className="font-semibold text-lg mb-2">Drop your pet's photo here</div>
              <div className="text-white/40 text-sm mb-4">JPG, PNG, HEIC — any photo works</div>
              <button className="bg-white/10 border border-white/20 px-6 py-2 rounded-xl text-sm hover:bg-white/20 transition">Choose File</button>
              <p className="text-xs text-white/20 mt-3">Upload feature coming soon — join the waitlist to get notified</p>
            </div>

            <div className="mb-6">
              <label className="text-sm text-white/60 block mb-2">What's your pet's name?</label>
              <input
                type="text"
                placeholder="e.g. Biscuit, Dexter, Professor Mittens..."
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="mb-8">
              <label className="text-sm text-white/60 block mb-3">Pick a podcast format</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PODCAST_FORMATS.map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`text-left p-4 rounded-2xl border transition ${
                      selectedFormat === fmt.id
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{fmt.emoji}</div>
                    <div className="font-semibold text-sm">{fmt.label}</div>
                    <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{fmt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-3xl p-6 mb-6">
              <div className="text-xs text-white/40 mb-3 uppercase tracking-wider">Preview: Character bible output</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Host Name', value: 'Sir Barksalot, Executive Corgi' },
                  { label: 'Voice Style', value: 'Confident, jargon-heavy, aggressively cheerful' },
                  { label: 'Catchphrase', value: '"That\'s synergy, not a problem."' },
                  { label: 'Recurring Bit', value: 'References Gerald (stuffed bear) as senior analyst' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-white/40 text-xs uppercase mb-1">{item.label}</div>
                    <div className="text-white/80">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setEmailSubmitted(false); setView('landing'); }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition"
            >
              🎙️ Generate My Pet Host — Join Waitlist
            </button>
            <p className="text-center text-white/30 text-xs mt-3">Full generation coming soon.</p>
          </div>
        )}

        {/* ════════════════════════════════ CLIP BROWSER ════════════════════════════════ */}
        {view === 'clip_preview' && (
          <div className="max-w-6xl mx-auto px-4 py-16">
            <button onClick={() => setView('landing')} className="text-white/40 hover:text-white text-sm mb-8 flex items-center gap-2 transition">← Back</button>
            <h2 className="text-4xl font-black mb-2">Clip Library</h2>
            <p className="text-white/50 mb-8">10 demo clips. Each is a complete JSON scene for the animal-podcast Seedance 2.0 pipeline.</p>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
              {DEMO_CLIPS.map((c, i) => (
                <button
                  key={c.clip_id}
                  onClick={() => setActiveClip(i)}
                  className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                    activeClip === i ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  {c.pet_host}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{clip.show_title}</span>
                  <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full">{clip.duration_seconds}s · {clip.aspect_ratio}</span>
                </div>
                <div className="text-white/40 text-sm mb-5">{clip.episode_title}</div>
                <div className="space-y-4">
                  <Field label="🎣 Hook" value={clip.hook} big />
                  <Field label="Setup" value={clip.setup} />
                  <Field label="The Take" value={clip.pet_take} />
                  <Field label="💥 Punchline" value={clip.punchline} bold />
                  <Field label="📣 CTA" value={clip.call_to_action} />
                </div>
                <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
                  <Field label="🎬 Scene" value={clip.scene_direction} small />
                  <Field label="🎵 Audio" value={clip.audio_direction} small />
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Caption</div>
                    <div className="text-sm italic text-white/60">{clip.caption}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {clip.hashtags.slice(0, 6).map(h => (
                      <span key={h} className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2 mt-1">
                    <span className="text-xs text-white/40 uppercase tracking-wider">Thumbnail: </span>
                    <span className="text-xs font-black text-white">{clip.thumbnail_text}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-green-400">{clip.clip_id}.json</span>
                  <span className="text-xs text-white/30">Full scene data</span>
                </div>
                <pre className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 text-xs font-mono text-green-300 overflow-auto max-h-[600px]">
                  {JSON.stringify(clip, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ VET VIEW ════════════════════════════════ */}
        {view === 'vet' && (
          <div className="max-w-4xl mx-auto px-4 py-16">
            <button onClick={() => setView('landing')} className="text-white/40 hover:text-white text-sm mb-8 flex items-center gap-2 transition">← Back</button>
            <div className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">Petlore for Veterinary Clinics</div>
            <h2 className="text-4xl font-black mb-4">The Vet Newsletter OS</h2>
            <p className="text-white/60 text-lg mb-12 max-w-2xl">
              Every veterinary clinic should own a pet audience. Automated, entertaining content that educates pet owners, builds retention, and drives appointments.
            </p>

            <div className="grid md:grid-cols-2 gap-5 mb-12">
              {[
                { icon: '📰', title: 'Weekly Pet Newsletter', desc: 'Automated newsletters with funny pet stories, health tips, seasonal alerts, and clinic promotions.' },
                { icon: '🦷', title: 'Dental Month Campaigns', desc: 'Pre-built February dental awareness content. Drives bookings with educational clips and a cartoon pet host.' },
                { icon: '🌿', title: 'Seasonal Health Alerts', desc: 'Flea & tick, heartworm season, holiday food warnings — automated and branded to your clinic.' },
                { icon: '🐾', title: 'Pet of the Month', desc: 'Feature a patient\'s pet every issue. Drives shares, loyalty, and word-of-mouth.' },
                { icon: '🎬', title: 'TikTok Clips for Clinics', desc: 'Cartoon pet hosts explain health topics in 30-second clips using the animal-podcast pipeline.' },
                { icon: '🤖', title: '5 AI Vet Agents', desc: 'Newsletter, Education, Community, Reminder, and Sponsorship agents.' },
              ].map(item => (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-bold mb-2">{item.title}</div>
                  <div className="text-sm text-white/50">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Sample newsletter */}
            <div className="bg-gradient-to-br from-teal-900/30 to-blue-900/30 border border-teal-500/20 rounded-3xl p-6 mb-8">
              <div className="text-sm text-teal-400 font-semibold mb-1">Sample Newsletter Output</div>
              <div className="text-2xl font-black mb-1">The Biscuit Bulletin</div>
              <div className="text-white/50 text-sm mb-4">Blue Ridge Animal Hospital · Asheville, NC · Issue #12</div>
              <div className="text-xs bg-teal-900/40 border border-teal-500/30 rounded-xl p-3 font-mono text-teal-300 mb-4">
                Subject: 🦷 February is Dental Month — and Biscuit has something to say
              </div>
              <div className="space-y-3">
                {[
                  { tag: 'Funny Story', headline: 'Biscuit Tried to Floss. It Did Not Go Well.', body: 'Book a dental cleaning before Feb 28 and save 15%.' },
                  { tag: 'Health Tip', headline: '3 Signs Your Pet Needs a Dental Check', body: 'Bad breath, pawing at mouth, changes in eating habits.' },
                  { tag: 'Pet Spotlight', headline: 'Pet of the Month: Mochi the Shih Tzu', body: 'Came in with a serious dental issue in January. Left fully healed and stealing socks again.' },
                ].map(s => (
                  <div key={s.headline} className="bg-white/5 rounded-xl p-4">
                    <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider">{s.tag}</span>
                    <div className="font-bold mt-1 mb-1">{s.headline}</div>
                    <div className="text-sm text-white/50">{s.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-white/40 text-lg mb-4 italic">"Your clinic should be a media brand."</p>
              <button
                onClick={() => setView('landing')}
                className="bg-teal-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-teal-500 transition"
              >
                Get Early Access for Your Clinic →
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="border-t border-white/10 px-4 py-10 text-center text-white/30 text-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🎙️</span>
            <span className="font-black text-white/60">PETLORE</span>
          </div>
          <p className="mb-2">The Internet's First Pet Podcast Agency</p>
          <p className="text-xs text-white/20">Cartoon Pets. Real Podcasts. Viral Clips. · animal-podcast skill v0.5.1 integrated</p>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, big, bold, small }: { label: string; value: string; big?: boolean; bold?: boolean; small?: boolean }) {
  return (
    <div>
      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className={`${big ? 'text-xl font-black' : small ? 'text-xs text-white/50' : 'text-sm text-white/70'} ${bold ? 'font-bold text-white' : ''}`}>
        {value}
      </div>
    </div>
  );
}
