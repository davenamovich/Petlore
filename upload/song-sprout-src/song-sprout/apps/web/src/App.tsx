import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { KidsStudio } from './components/KidsStudio/KidsStudio';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { Baby, LayoutDashboard, ShieldCheck, Home, LogOut, Menu, X } from 'lucide-react';

type View = 'landing' | 'studio' | 'dashboard' | 'admin';

function useRoute(): [View, (v: View, path: string) => void] {
  const pathToView = (p: string): View => {
    if (p === '/studio') return 'studio';
    if (p === '/dashboard') return 'dashboard';
    if (p === '/admin') return 'admin';
    return 'landing';
  };
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname));

  useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (v: View, path: string) => {
    window.history.pushState({}, '', path);
    setView(v);
  };

  return [view, navigate];
}

function useAuth() {
  const [user, setUser] = useState<{ username: string; isAdmin?: boolean } | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ss_token'));

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.user && setUser(d.user))
      .catch(() => {});
  }, [token]);

  const login = async (username: string) => {
    const r = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!r.ok) throw new Error('Login failed');
    const d = await r.json();
    localStorage.setItem('ss_token', d.token);
    setToken(d.token);
    setUser(d.user);
  };

  const logout = () => {
    localStorage.removeItem('ss_token');
    setToken(null);
    setUser(null);
  };

  return { user, token, login, logout };
}

function AppNav({ view, navigate, user, onLogin, onLogout }: {
  view: View;
  navigate: (v: View, path: string) => void;
  user: { username: string; isAdmin?: boolean } | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  const links = [
    { v: 'studio' as View, path: '/studio', icon: Baby, label: 'Create Song' },
    { v: 'dashboard' as View, path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(user?.isAdmin ? [{ v: 'admin' as View, path: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-100 dark:border-white/5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => navigate('landing', '/')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow">
            <Baby className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent hidden sm:block">
            Song Sprout
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {links.map(({ v, path, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => navigate(v, path)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400">{user.username}</span>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-full hover:shadow-md hover:scale-105 transition-all"
            >
              Get Started
            </button>
          )}
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-950 px-4 py-3 flex flex-col gap-1">
          <button onClick={() => { navigate('landing', '/'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Home className="w-4 h-4" /> Home
          </button>
          {links.map(({ v, path, icon: Icon, label }) => (
            <button key={v} onClick={() => { navigate(v, path); setOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

function LoginModal({ onLogin, onClose }: { onLogin: (u: string) => Promise<void>; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onLogin(username.trim());
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
            <Baby className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Get started with Song Sprout</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Choose a display name to begin</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Your name or nickname"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {loading ? 'Getting started...' : 'Start creating songs'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [view, navigate] = useRoute();
  const { user, token, login, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const goToStudio = () => navigate('studio', '/studio');

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {view === 'landing' ? (
        <LandingPage
          onGetStarted={() => { user ? goToStudio() : setShowLogin(true); }}
          onSignIn={() => setShowLogin(true)}
        />
      ) : (
        <>
          <AppNav
            view={view}
            navigate={navigate}
            user={user}
            onLogin={() => setShowLogin(true)}
            onLogout={() => { logout(); navigate('landing', '/'); }}
          />
          <main>
            {view === 'studio' && <KidsStudio />}
            {view === 'dashboard' && (
              <Dashboard
                user={user}
                songs={[]}
                onCreateSong={goToStudio}
                onPlaySong={() => {}}
                currentSong={null}
                isPlaying={false}
              />
            )}
            {view === 'admin' && <AdminPanel token={token || undefined} />}
          </main>
        </>
      )}

      {showLogin && (
        <LoginModal
          onLogin={login}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
