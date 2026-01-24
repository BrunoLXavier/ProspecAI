/**
 * MediaPlayer Component
 * 
 * Unified audio/video player for message attachments with:
 * - Audio visualization and controls
 * - Video player with full controls
 * - Download capability
 * - Responsive design
 * 
 * Implements RF-08: Communications media playback
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

interface Props {
  src: string;
  type: 'audio' | 'video';
  filename?: string;
  poster?: string;
  onError?: (error: Error) => void;
}

export default function MediaPlayer({ src, type, filename, poster, onError }: Props) {
  const t = useTranslations('communications');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleLoadedMetadata = () => {
      setDuration(media.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      const error = new Error('Failed to load media');
      setError(t('mediaLoadError') || 'Failed to load media');
      onError?.(error);
    };

    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('error', handleError);

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('error', handleError);
    };
  }, [src, t, onError]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;

    const newVolume = parseFloat(e.target.value);
    media.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    const progress = progressRef.current;
    if (!media || !progress) return;

    const rect = progress.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    media.currentTime = pos * duration;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename || `${type}-${Date.now()}.webm`;
    link.click();
  };

  const handleFullscreen = () => {
    const media = mediaRef.current;
    if (!media || type !== 'video') return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      (media as HTMLVideoElement).requestFullscreen();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 dark:text-gray-400">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
        {/* Audio element (hidden) */}
        <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={src} preload="metadata" />

        {/* Play button */}
        <button
          onClick={togglePlay}
          disabled={!isLoaded}
          className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-2 bg-gray-300 dark:bg-slate-600 rounded-full cursor-pointer overflow-hidden"
          >
            <div
              className="h-full bg-primary-600 transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            {isMuted || volume === 0 ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-300 dark:bg-slate-600 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          title={t('download') || 'Download'}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Video player
  return (
    <div className="relative group bg-black rounded-lg overflow-hidden">
      {/* Video element */}
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={src}
        poster={poster}
        preload="metadata"
        className="w-full max-h-96 object-contain"
        onClick={togglePlay}
      />

      {/* Play overlay */}
      {!isPlaying && isLoaded && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition"
        >
          <div className="p-4 bg-white/90 rounded-full">
            <PlayIcon className="w-8 h-8 text-gray-900" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className="p-1.5 text-white hover:text-primary-400 transition"
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-white/80">{formatTime(currentTime)}</span>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer overflow-hidden"
            >
              <div
                className="h-full bg-primary-500 transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-white/80">{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="p-1.5 text-white hover:text-primary-400 transition"
          >
            {isMuted || volume === 0 ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="p-1.5 text-white hover:text-primary-400 transition"
          >
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-white hover:text-primary-400 transition"
            title={t('download') || 'Download'}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
