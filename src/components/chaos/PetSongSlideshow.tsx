'use client';

import React, { useState, useEffect } from 'react';
import { ChaosSong } from '@/lib/db';
import { PlayCircle, PauseCircle, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';

interface PetSongSlideshowProps {
  song: ChaosSong;
  lyrics: string;
  onBack?: () => void;
  onNext?: () => void;
}

const PetSongSlideshow: React.FC<PetSongSlideshowProps> = ({ 
  song, 
  lyrics, 
  onBack,
  onNext 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  
  // Parse lyrics into sections to create slideshow transitions
  const parseLyrics = (lyrics: string) => {
    const sections = lyrics.split(/(\[.*?\])/);
    return sections
      .filter(section => section.trim())
      .map(section => {
        if (section.startsWith('[') && section.endsWith(']')) {
          return { type: 'section', content: section };
        } else {
          return { type: 'lyrics', content: section };
        }
      });
  };

  const sections = parseLyrics(lyrics);
  
  // Auto-play functionality for the slideshow
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && sections.length > 0) {
      interval = setInterval(() => {
        setCurrentSection(prev => (prev + 1) % sections.length);
      }, 4000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, sections.length]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const nextSection = () => {
    setCurrentSection((prev) => (prev + 1) % sections.length);
  };

  const prevSection = () => {
    setCurrentSection((prev) => (prev - 1 + sections.length) % sections.length);
  };

  // Get current section content
  const currentContent = sections[currentSection]?.content || '';
  
  // Check if current content is a section header
  const isSectionHeader = sections[currentSection]?.type === 'section';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
              {song.songTitle || 'Pet Song Slideshow'}
            </h1>
            <p className="text-gray-300 mt-2">
              {song.petType} • {song.personality} • {song.musicGenre}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowLyrics(!showLyrics)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Slideshow Content */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex justify-center items-center h-96 md:h-[500px]">
            {isSectionHeader ? (
              <div className="text-center p-6">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
                  {currentContent}
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-pink-500 mx-auto rounded-full"></div>
              </div>
            ) : (
              <div className="text-center max-w-3xl">
                <p className="text-xl md:text-2xl leading-relaxed">
                  {currentContent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar and Controls */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Section {currentSection + 1} of {sections.length}</span>
              <span>{Math.floor((currentSection / sections.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentSection / sections.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center space-x-6">
            <button 
              onClick={prevSection}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              <SkipBack size={24} />
            </button>
            
            <button 
              onClick={togglePlay}
              className="p-4 bg-gradient-to-r from-yellow-500 to-pink-500 hover:from-yellow-600 hover:to-pink-600 rounded-full transition-all transform hover:scale-105"
            >
              {isPlaying ? <PauseCircle size={32} /> : <PlayCircle size={32} />}
            </button>
            
            <button 
              onClick={nextSection}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              <SkipForward size={24} />
            </button>
          </div>
        </div>

        {/* Lyrics Display */}
        {showLyrics && (
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">Lyrics</h3>
            <div className="bg-black/40 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {lyrics}
              </pre>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center space-x-4 mt-8">
          {onBack && (
            <button 
              onClick={onBack}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back to Studio
            </button>
          )}
          {onNext && (
            <button 
              onClick={onNext}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-colors"
            >
              Create Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetSongSlideshow;