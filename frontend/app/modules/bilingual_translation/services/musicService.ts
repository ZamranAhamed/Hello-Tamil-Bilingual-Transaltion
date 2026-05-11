import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

let backgroundMusic: Audio.Sound | null = null;
let currentTrackType: 'menu' | 'game' | null = null;
let isMuted = false;
let isInitialized = false;

// ── Stop-callback registry ──────────────────────────────────────────────────
// Other audio services (nimoAudioService, soundService) register here.
// When the user mutes, ALL registered callbacks are called to kill every sound.
const stopCallbacks: Array<() => void> = [];

export const registerStopCallback = (cb: () => void) => {
  if (!stopCallbacks.includes(cb)) {
    stopCallbacks.push(cb);
  }
};
// ───────────────────────────────────────────────────────────────────────────

export const initAudio = async () => {
  if (isInitialized) return isMuted;
  try {
    const saved = await AsyncStorage.getItem('global_mute_state');
    if (saved !== null) {
      isMuted = JSON.parse(saved);
    }
    isInitialized = true;
    return isMuted;
  } catch (error) {
    console.error('Error initializing audio:', error);
    return isMuted;
  }
};

export const toggleMute = async (): Promise<boolean> => {
  isMuted = !isMuted;
  try {
    await AsyncStorage.setItem('global_mute_state', JSON.stringify(isMuted));

    if (isMuted) {
      // ── MUTE: pause background music + kill every registered sound ──
      if (backgroundMusic) {
        try {
          const status = await backgroundMusic.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await backgroundMusic.pauseAsync();
          }
        } catch (_) {}
      }
      // Tell every other service to stop its currently playing audio
      stopCallbacks.forEach(cb => { try { cb(); } catch (_) {} });
    } else {
      // ── UNMUTE: resume background music ────────────────────────────
      if (backgroundMusic) {
        try {
          const status = await backgroundMusic.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            await backgroundMusic.playAsync();
          }
        } catch (_) {}
      }
    }
  } catch (error) {
    console.error('Error toggling mute:', error);
  }
  return isMuted;
};

export const getMuteState = () => isMuted;

// Adjust paths if necessary. Relative to: frontend/app/modules/bilingual_translation/services/
const MENU_MUSIC = require('../../../../assets/music/menu_music.mp3');
const GAME_MUSIC = require('../../../../assets/music/game_music.mp3');

export const stopMusic = async () => {
  try {
    if (backgroundMusic) {
      await backgroundMusic.stopAsync();
      await backgroundMusic.unloadAsync();
      backgroundMusic = null;
      currentTrackType = null;
    }
  } catch (error) {
    console.error('Error stopping background music:', error);
  }
};

const playMusic = async (source: any, trackType: 'menu' | 'game') => {
  try {
    // If the requested track is already the current track, ensure it's playing
    if (backgroundMusic && currentTrackType === trackType) {
      const status = await backgroundMusic.getStatusAsync();
      if (status.isLoaded && (status.isPlaying || isMuted)) {
        return; // Already playing (or loaded but paused due to mute)
      }
    }

    // Stop any currently playing music to guarantee no overlaps
    await stopMusic();

    const { sound } = await Audio.Sound.createAsync(
      source,
      {
        shouldPlay: !isMuted,   // Don't auto-play if muted
        isLooping: true,
        volume: 0.3,
      }
    );

    backgroundMusic = sound;
    currentTrackType = trackType;
  } catch (error) {
    console.error(`Error playing ${trackType} music:`, error);
  }
};

export const playMenuMusic = async () => {
  await playMusic(MENU_MUSIC, 'menu');
};

export const playGameMusic = async () => {
  await playMusic(GAME_MUSIC, 'game');
};


export default function DummyRoute() { return null; }
