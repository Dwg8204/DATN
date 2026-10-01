import React, { useState, useRef, useEffect } from 'react';
import styles from './AudioPlayer.module.css';
import { useToast } from '../../../context/ToastContext';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioPlayer({ src, maxPlays = 2, compact = false, allowSkip = true }) {
  const { showError } = useToast();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioError, setAudioError] = useState('');

  const isMaxPlaysReached = maxPlays !== undefined && maxPlays !== Infinity && playCount >= maxPlays;

  useEffect(() => {
    setAudioError('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayCount(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setAudioError('');
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlayCount(prev => prev + 1);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update audio volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (isMaxPlaysReached) return;
    if (!src) {
      const message = 'This recording is unavailable. Please try another question or contact support.';
      setAudioError(message);
      showError(message);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setAudioError('');
      }).catch(err => {
        if (err.name === 'AbortError') return;
        const message = err.name === 'NotAllowedError'
          ? 'Your browser blocked audio playback. Allow audio for this site, then press Play again.'
          : 'Unable to play this recording. Check your connection and try again.';
        setIsPlaying(false);
        setAudioError(message);
        showError(message);
      });
    }
  };

  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newVolume = x / rect.width;
    newVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(newVolume);
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
    }
  };

  const handleTimeSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  return (
    <div className={compact ? styles.audioCompact : styles.audioMock}>
      <audio ref={audioRef} src={src} preload="metadata" onError={() => {
        setIsPlaying(false);
        setAudioError('Unable to load this recording. Check your connection and try again.');
      }} />
      
      {!compact && (
        <div className={styles.audioPlaceholder}>
          <img src="https://placehold.co/600x250?text=Audio+Visualizer" alt="Audio Visualizer" className={styles.audioImage} />
        </div>
      )}
      
      <div className={styles.audioControlsRow}>
        <div className={styles.topRow}>
          <div className={styles.timeDisplay}>
            {formatTime(currentTime)}
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressTrack} onClick={handleTimeSeek}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className={styles.timeDisplay}>
            {formatTime(duration)}
          </div>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.playbackControls}>
            <button 
              className={styles.rewindBtn} 
              onClick={skipBackward} 
              disabled={!allowSkip || (isMaxPlaysReached && !isPlaying)}
              style={{ opacity: allowSkip ? 1 : 0.35, cursor: allowSkip ? 'pointer' : 'not-allowed' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
            
            <button className={styles.playBtn} onClick={togglePlay} disabled={isMaxPlaysReached && !isPlaying}>
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            <button 
              className={styles.forwardBtn} 
              onClick={skipForward} 
              disabled={!allowSkip || (isMaxPlaysReached && !isPlaying)}
              style={{ opacity: allowSkip ? 1 : 0.35, cursor: allowSkip ? 'pointer' : 'not-allowed' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11V9a4 4 0 0 0-4-4H3" />
                <polyline points="17 23 21 19 17 15" />
                <path d="M3 13v2a4 4 0 0 0 4 4h14" />
              </svg>
            </button>
          </div>

          <div className={styles.volumeGroup}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div className={styles.volumeTrack} onClick={handleVolumeChange}>
              <div className={styles.volumeFill} style={{ width: `${volume * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {audioError && <p className={styles.audioError} role="status">{audioError}</p>}
      
      {isMaxPlaysReached && (
        <div className={styles.playWarning}>
          Max plays reached (2/2)
        </div>
      )}
    </div>
  );
}
