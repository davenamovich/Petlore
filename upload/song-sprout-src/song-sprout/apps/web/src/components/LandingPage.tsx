import React, { useState } from 'react';
import { Music, Star, Sparkles, Heart, Zap, Check, Play, ArrowRight, Baby, MoonStar, Sun, GraduationCap, Mic2, Waves } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const SONG_TYPES = [
  { icon: MoonStar, label: 'Starry Lullaby', color: 'from-indigo-500 to-purple-600', desc: 'Drift off to sleep' },
  { icon: Waves, label: 'Ocean Lullaby', color: 'from-blue-500 to-cyan-500', desc: 'Gentle wave sounds' },
  { icon: Star, label: 'Birthday Song', color: 'from-yellow-400 to-orange-500', desc: 'Celebrate the big day' },
  { icon: Sun, label: 'Good Morning', color: 'from-orange-400 to-pink-500', desc: 'Rise and shine' },
  { icon: GraduationCap, label: 'Alphabet Song', color: 'from-emerald-500 to-teal-500', desc: 'Learn the ABCs' },
  { icon: Zap, label: 'Superhero Anthem', color: 'from-red-500 to-pink-500', desc: 'Confidence builder' },
  { icon: Heart, label: 'My Pet & Me', color: 'from-rose-400 to-pink-500', desc: 'Celebrate furry friends' },
  { icon: GraduationCap, label: 'Counting Song', color: 'from-violet-500 to-purple-500', desc: '1 to 10 with name' },
  { icon: Music, label: 'Dance Party', color: 'from-pink-500 to-rose-500', desc: 'Move and groove' },
  { icon: Sparkles, label: 'Brush Teeth', color: 'from-teal-400 to-cyan-500', desc: '2-minute routine' },
];

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '1.99',
    unit: 'per song',
    description: 'Perfect for gifting or trying it out',
    credits: '1 song credit',
    color: 'border-zinc-200 dark:border-white/10',
    cta: 'Buy 1 Song',
    features: ['Personalized with child\'s name', 'Choose any song type', 'MP3 download', 'Instant delivery'],
  },
  {
    name: 'Family',
    price: '9.99',
    unit: '/month',
    description: '10 songs a month — never run out',
    credits: '10 songs/month',
    color: 'border-purple-500',
    cta: 'Start Family Plan',
    badge: 'Most Popular',
    features: ['10 personalized songs/month', 'All 10 song types', 'MP3 download', 'Song history library', 'Priority generation'],
  },
  {
    name: 'Unlimited',
    price: '24.99',
    unit: '/month',
    description: 'For parents, educators, and gifters',
    credits: 'Unlimited songs',
    color: 'border-zinc-200 dark:border-white/10',
    cta: 'Go Unlimited',
    features: ['Unlimited songs/month', 'All 10 song types', 'MP3 download', 'Song history library', 'Priority generation', 'Early access to new song types'],
  },
];

const STEPS = [
  { number: '01', title: "Enter your child's name", desc: 'Type their name exactly as you want it sung — the AI will place it naturally throughout the song.' },
  { number: '02', title: 'Pick a song type', desc: 'Choose from lullabies, birthday songs, learning songs, dance anthems, and more.' },
  { number: '03', title: 'Get a song in seconds', desc: 'Our AI writes personalized lyrics and generates a full MP3, ready to play and download.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  const [demoName, setDemoName] = useState('Emma');
  const [demoType, setDemoType] = useState(0);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 dark:border-white/5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Baby className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Song Sprout</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-4 py-2"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2 rounded-full shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all"
            >
              Create a Song
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered personalized kids songs
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Your child's name.<br />
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
              In every verse.
            </span>
          </h1>

          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Personalized songs that say your child's name 10–15 times. Lullabies, birthday songs, ABCs, superhero anthems — generated in seconds, downloaded as MP3.
          </p>

          {/* Demo widget */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 max-w-md mx-auto mb-10 text-left shadow-xl shadow-purple-500/5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Try it — enter a name</p>
            <input
              type="text"
              value={demoName}
              onChange={e => setDemoName(e.target.value)}
              placeholder="Child's name"
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-lg px-4 py-3 text-lg font-semibold mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['Lullaby', 'Birthday', 'Superhero', 'Dance Party'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setDemoType(i)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${demoType === i ? 'bg-purple-600 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 hover:border-purple-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {demoName && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/30 rounded-lg p-3 text-sm text-purple-800 dark:text-purple-300 font-medium italic">
                "Sleep tight {demoName}, sleep tight / Dreams of moonbeams pure and bright / {demoName.toUpperCase()}, sleep tight..."
              </div>
            )}
            <button
              onClick={onGetStarted}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Generate for {demoName || 'your child'}
            </button>
          </div>

          <p className="text-sm text-zinc-400">No account needed for preview · From $1.99 per song</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How Song Sprout works</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-14 text-lg">Three steps. Under a minute. Ready to play.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(step => (
              <div key={step.number} className="text-center">
                <div className="text-6xl font-black text-purple-100 dark:text-purple-900 mb-2">{step.number}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Song Types */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">10 song types to choose from</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-14 text-lg">Every milestone. Every routine. Every celebration.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {SONG_TYPES.map(({ icon: Icon, label, color, desc }) => (
              <div
                key={label}
                onClick={onGetStarted}
                className="group cursor-pointer bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-600 to-pink-500">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex justify-center gap-1 mb-4">
            {[0,1,2,3,4].map(i => <Star key={i} className="w-6 h-6 fill-yellow-300 text-yellow-300" />)}
          </div>
          <blockquote className="text-2xl font-medium mb-4 italic">
            "My daughter cried happy tears when she heard her name in the lullaby. We've played it every night for a week."
          </blockquote>
          <p className="text-purple-200 font-medium">— Sarah K., mom of 3-year-old Lily</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-14 text-lg">Credits never expire. Cancel subscriptions anytime.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 ${plan.color} p-8 flex flex-col ${plan.badge ? 'shadow-2xl shadow-purple-500/20' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-zinc-400 mb-1">{plan.unit}</span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-600 dark:text-zinc-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.badge
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02]'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-4">
            Make their name the star of the song.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
            Parents will play this 50+ times. Make it beautiful.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl shadow-purple-500/30 hover:scale-105 transition-all"
          >
            Create your first song
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Baby className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">Song Sprout</span>
          </div>
          <p>© {new Date().getFullYear()} Song Sprout. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
