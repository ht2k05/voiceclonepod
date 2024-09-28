'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from './styles/AudioPlayer.module.css';
import { FaDownload } from 'react-icons/fa';

const FaMicrophone = dynamic(() => import('react-icons/fa').then(mod => mod.FaMicrophone), { ssr: false });
const FaSpinner = dynamic(() => import('react-icons/fa').then(mod => mod.FaSpinner), { ssr: false });
const FaPlay = dynamic(() => import('react-icons/fa').then(mod => mod.FaPlay), { ssr: false });
const FaPause = dynamic(() => import('react-icons/fa').then(mod => mod.FaPause), { ssr: false });
const FaBackward = dynamic(() => import('react-icons/fa').then(mod => mod.FaBackward), { ssr: false });
const FaForward = dynamic(() => import('react-icons/fa').then(mod => mod.FaForward), { ssr: false });
const FaVolumeUp = dynamic(() => import('react-icons/fa').then(mod => mod.FaVolumeUp), { ssr: false });
const FaVolumeMute = dynamic(() => import('react-icons/fa').then(mod => mod.FaVolumeMute), { ssr: false });

export default function Home() {
  const [article, setArticle] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generatePodcast = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate podcast');
      }

      const data = await response.json();
      console.log('Received podcast data:', data);
      setPodcastUrl(data.podcastUrl);
    } catch (error) {
      console.error('Error generating podcast:', error);
      setError('Failed to generate podcast. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleDownload = () => {
    if (podcastUrl) {
      const link = document.createElement('a');
      link.href = podcastUrl;
      link.download = 'podcast.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex flex-col items-center justify-center p-8">
      <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          {FaMicrophone && <FaMicrophone className="inline-block mr-2 mb-1" />}
          VoiceClone Podcast Creator
        </h1>
        <textarea
          className="w-full h-40 p-4 border border-gray-300 rounded-xl bg-white bg-opacity-50 backdrop-blur-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ease-in-out"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          placeholder="Paste your article here..."
        />
        <button
          className={`mt-6 px-6 py-3 rounded-full font-bold text-white transition duration-200 ease-in-out ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transform hover:scale-105'
          }`}
          onClick={generatePodcast}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              {FaSpinner && <FaSpinner className="inline-block mr-2 animate-spin" />}
              Generating...
            </>
          ) : (
            'Generate Podcast'
          )}
        </button>
        {error && <p className="text-red-300 mt-4 text-center">{error}</p>}
        {podcastUrl && (
          <div className={`mt-8 ${styles.audioPlayer}`}>
            <h2 className="text-2xl font-bold mb-4 text-white">Your Podcast is Ready!</h2>
            <audio
              ref={audioRef}
              src={podcastUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                console.error('Audio playback error:', e);
                setError('Error playing the podcast. Please try again.');
              }}
            />
            <div className={styles.controls}>
              <button onClick={() => handleSkip(-10)} className={styles.controlButton}>
                {FaBackward && <FaBackward />}
                <span className={styles.buttonLabel}>10s</span>
              </button>
              <button onClick={handlePlayPause} className={styles.playPauseButton}>
                {isPlaying ? (FaPause && <FaPause />) : (FaPlay && <FaPlay />)}
              </button>
              <button onClick={() => handleSkip(10)} className={styles.controlButton}>
                {FaForward && <FaForward />}
                <span className={styles.buttonLabel}>10s</span>
              </button>
            </div>
            <div className={styles.progressContainer}>
              <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className={styles.seekBar}
              />
              <span className={styles.timeLabel}>{formatTime(duration)}</span>
            </div>
            <div className={styles.bottomControls}>
              <div className={styles.volumeControl}>
                <button onClick={() => setVolume(v => v === 0 ? 1 : 0)} className={styles.iconButton}>
                  {volume === 0 ? (FaVolumeMute && <FaVolumeMute />) : (FaVolumeUp && <FaVolumeUp />)}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeBar}
                />
              </div>
              <div className={styles.playbackRateControl}>
                {[1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`${styles.rateButton} ${playbackRate === rate ? styles.activeRate : ''}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <button onClick={handleDownload} className={styles.downloadButton}>
                <FaDownload />
                <span className={styles.buttonLabel}>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
