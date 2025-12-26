import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';

interface UseAudioOptions {
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export function useAudio(url: string | null, options: UseAudioOptions = {}) {
  const { volume = 1, loop = false, autoplay = false } = options;
  const soundRef = useRef<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Cleanup previous sound
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, []);

  // Load new sound when URL changes
  useEffect(() => {
    if (!url) {
      if (soundRef.current) {
        soundRef.current.unload();
        soundRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    const sound = new Howl({
      src: [url],
      volume,
      loop,
      html5: true,
      onload: () => {
        setIsLoading(false);
        setDuration(sound.duration());
        if (autoplay) {
          sound.play();
          setIsPlaying(true);
        }
      },
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
      },
      onend: () => {
        if (!loop) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      },
      onloaderror: (_, error) => {
        console.error('Audio load error:', error);
        setIsLoading(false);
      },
    });

    soundRef.current = sound;

    return () => {
      sound.unload();
    };
  }, [url, volume, loop, autoplay]);

  // Update current time
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (soundRef.current) {
        setCurrentTime(soundRef.current.seek() as number);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const play = useCallback(() => {
    soundRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    soundRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    soundRef.current?.stop();
  }, []);

  const seek = useCallback((time: number) => {
    soundRef.current?.seek(time);
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((vol: number) => {
    soundRef.current?.volume(vol);
  }, []);

  return {
    isPlaying,
    isLoading,
    duration,
    currentTime,
    play,
    pause,
    stop,
    seek,
    setVolume,
  };
}
