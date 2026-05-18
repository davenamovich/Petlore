'use client';

import React, { useState, useEffect } from 'react';
import { ChaosSong } from '@/lib/db';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Video, 
  Music, 
  Star,
  Sparkles
} from 'lucide-react';

interface VideoGenerationProps {
  song: ChaosSong;
  lyrics: string;
  onBack?: () => void;
  onComplete?: () => void;
}

const PetSongVideoGenerator: React.FC<VideoGenerationProps> = ({ 
  song, 
  lyrics,
  onBack,
  onComplete 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Simulated video generation process
  const generateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Initializing video engine...');
    
    // Simulate progress
    const steps = [
      'Initializing AI vision engine',
      'Generating visual assets',
      'Creating animated transitions',
      'Synthesizing audio track',
      'Compositing final video',
      'Optimizing for platforms'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // Simulate video creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setVideoUrl('/sample-video.mp4');
    setIsGenerating(false);
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('Initializing...');
    setVideoUrl(null);
  };

  // Generate video when component mounts
  useEffect(() => {
    if (song && !isGenerating && !videoUrl) {
      generateVideo();
    }
  }, [song, isGenerating, videoUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
              Video Studio
            </h1>
            <p className="text-gray-300 mt-2">
              {song.songTitle || 'Pet Song Video Generator'} • {song.petType}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-black/30 px-4 py-2 rounded-lg">
              <Star className="text-yellow-400" size={20} />
              <span className="text-sm">AI Generated</span>
            </div>
            <div className="flex items-center space-x-2 bg-black/30 px-4 py-2 rounded-lg">
              <Sparkles className="text-purple-400" size={20} />
              <span className="text-sm">Chaotic</span>
            </div>
          </div>
        </div>

        {/* Video Preview Area */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col items-center">
            {isGenerating ? (
              <div className="w-full max-w-2xl">
                <div className="bg-gray-800 rounded-xl p-8 text-center">
                  <div className="mb-4">
                    <Video className="mx-auto text-blue-400" size={48} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Generating Video</h3>
                  <p className="text-gray-300 mb-4">{currentStep}</p>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400">{Math.round(progress)}% Complete</p>
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full max-w-4xl">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <video 
                    src={videoUrl} 
                    autoPlay={isPlaying}
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      onClick={handlePlay}
                      className="bg-black/50 hover:bg-black/70 rounded-full p-4 transition-colors"
                    >
                      {isPlaying ? <Pause size={40} /> : <Play size={40} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-2xl">
                <div className="bg-gray-800/50 rounded-xl p-8 text-center">
                  <Video className="mx-auto text-blue-400" size={48} />
                  <h3 className="text-xl font-semibold mt-4 mb-2">Ready to Generate</h3>
                  <p className="text-gray-300 mb-4">
                    Click below to generate your pet song video using AI visuals and audio
                  </p>
                  <button 
                    onClick={generateVideo}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all transform hover:scale-105"
                  >
                    Generate Video
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {videoUrl && (
                <button 
                  onClick={() => window.open(videoUrl, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Download size={18} />
                  <span>Download</span>
                </button>
              )}
              
              <button 
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lyrics and Song Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Music className="text-yellow-400" size={24} />
              <h3 className="text-xl font-bold">Song Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Pet Type</p>
                <p className="font-semibold">{song.petType}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Personality</p>
                <p className="font-semibold">{song.personality}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Genre</p>
                <p className="font-semibold">{song.musicGenre}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Visual Style</p>
                <p className="font-semibold">{song.visualStyle}</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="text-purple-400" size={24} />
              <h3 className="text-xl font-bold">Lyrics Preview</h3>
            </div>
            <div className="bg-black/40 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {lyrics}
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back to Slideshow
            </button>
          )}
          
          {onComplete && (
            <button 
              onClick={onComplete}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg transition-colors"
            >
              Save & Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetSongVideoGenerator;