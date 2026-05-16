import React, { useState, useEffect } from 'react';
import { Music, Plus, Download, Play, CreditCard, Star, Clock, Sparkles } from 'lucide-react';
import { Song } from '../types';

interface DashboardProps {
  user: { username: string; isAdmin?: boolean; avatar_url?: string } | null;
  songs: Song[];
  onCreateSong: () => void;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  songs,
  onCreateSong,
  onPlaySong,
  currentSong,
  isPlaying,
}) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [kidsSongs, setKidsSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [creditsRes, kidsRes] = await Promise.all([
          fetch('/api/kids/credits').catch(() => null),
          fetch('/api/kids/songs?limit=6').catch(() => null),
        ]);
        if (creditsRes?.ok) {
          const data = await creditsRes.json();
          setCredits(data.credits ?? null);
        }
        if (kidsRes?.ok) {
          const data = await kidsRes.json();
          setKidsSongs(data.songs || []);
        }
      } catch {
        // credits not implemented yet — that's ok
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recentSongs = songs.filter(s => s.audioUrl && !s.isGenerating).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-suno-DEFAULT p-6 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
            Welcome back{user?.username ? `, ${user.username}` : ''}!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Here's what's happening with your Song Sprout account.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3 opacity-80">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">Credits remaining</span>
            </div>
            <div className="text-4xl font-extrabold">
              {credits !== null ? credits : '—'}
            </div>
            <button
              onClick={() => window.location.href = '#pricing'}
              className="mt-3 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full"
            >
              + Buy credits
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <Music className="w-4 h-4" />
              <span className="text-sm font-medium">Total songs</span>
            </div>
            <div className="text-4xl font-extrabold text-zinc-900 dark:text-white">{recentSongs.length + kidsSongs.length}</div>
            <p className="mt-3 text-xs text-zinc-400">All time</p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Kids songs</span>
            </div>
            <div className="text-4xl font-extrabold text-zinc-900 dark:text-white">{kidsSongs.length}</div>
            <button
              onClick={onCreateSong}
              className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Create new
            </button>
          </div>
        </div>

        {/* Quick Create CTA */}
        <div
          onClick={onCreateSong}
          className="cursor-pointer mb-8 border-2 border-dashed border-purple-200 dark:border-purple-900/50 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-6 text-center transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-purple-500" />
          </div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Create a personalized kids song</p>
          <p className="text-sm text-zinc-400">Lullabies, birthday songs, ABCs, and more — with your child's name</p>
        </div>

        {/* Recent Kids Songs */}
        {kidsSongs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recent kids songs</h2>
              <button
                onClick={onCreateSong}
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {kidsSongs.slice(0, 6).map((song: any) => (
                <div
                  key={song.id}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {song.child_name}'s {song.song_type?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(song.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {song.mp3_url && (
                      <a
                        href={song.mp3_url}
                        download
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-purple-500 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {song.song_type && (
                      <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                        {song.song_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {song.duration > 0 && (
                      <span className="text-xs text-zinc-400">
                        {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Songs */}
        {recentSongs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Recent songs</h2>
            <div className="space-y-2">
              {recentSongs.map(song => (
                <div
                  key={song.id}
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{song.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{song.style?.slice(0, 50)}</p>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-purple-500 transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">{song.duration}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentSongs.length === 0 && kidsSongs.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No songs yet</h3>
            <p className="text-zinc-400 mb-6">Create your first personalized kids song to get started.</p>
            <button
              onClick={onCreateSong}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create a song
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
