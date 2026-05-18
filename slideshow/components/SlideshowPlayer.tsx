import React, { useState, useEffect, useRef } from 'react';

interface Slide {
  id: string;
  imageUrl: string;
  text: string;
  duration: number;
}

interface SlideshowPlayerProps {
  slides: Slide[];
  audioUrl: string;
  onSlideChange?: (slideIndex: number) => void;
}

const SlideshowPlayer: React.FC<SlideshowPlayerProps> = ({ 
  slides, 
  audioUrl,
  onSlideChange 
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setCurrentTime(progress);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentSlideIndex(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (slides.length > 0 && isPlaying) {
      const timer = setTimeout(() => {
        setCurrentSlideIndex(prev => {
          const nextIndex = (prev + 1) % slides.length;
          onSlideChange?.(nextIndex);
          return nextIndex;
        });
      }, slides[currentSlideIndex]?.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [currentSlideIndex, isPlaying, slides, onSlideChange]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(pos * 100);
  };

  const handleSlideClick = (index: number) => {
    if (index === currentSlideIndex) return;
    
    setCurrentSlideIndex(index);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  return (
    <div className="slideshow-container">
      <div className="slide-display">
        {slides.length > 0 && (
          <img 
            src={slides[currentSlideIndex].imageUrl} 
            alt={slides[currentSlideIndex].text}
            className="current-slide"
          />
        )}
      </div>
      
      <div className="slide-info">
        {slides.length > 0 && (
          <h3>{slides[currentSlideIndex].text}</h3>
        )}
      </div>
      
      <div className="controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      
      <div className="progress-container" ref={progressRef} onClick={handleSeek}>
        <div className="progress-bar" style={{ width: `${currentTime}%` }} />
      </div>
      
      <div className="slide-indicator">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`indicator-dot ${index === currentSlideIndex ? 'active' : ''}`}
            onClick={() => handleSlideClick(index)}
          />
        ))}
      </div>
      
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
};

export default SlideshowPlayer;