import { Audio } from 'expo-av';
import { getMuteState, registerStopCallback } from './musicService';

// Track every fire-and-forget sound so we can kill them all on mute
const activeSounds = new Set<Audio.Sound>();

// Register a stop callback so toggleMute can kill in-flight sound effects
registerStopCallback(() => {
  activeSounds.forEach(sound => {
    sound.stopAsync().catch(() => {});
    sound.unloadAsync().catch(() => {});
  });
  activeSounds.clear();
});

const playAndUnloadSound = async (source: any, volume: number = 1.0) => {
  if (getMuteState()) return;
  try {
    const { sound } = await Audio.Sound.createAsync(source);

    if (volume !== 1.0) {
      await sound.setVolumeAsync(volume);
    }

    activeSounds.add(sound);

    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound.unloadAsync();
        activeSounds.delete(sound);
      }
    });

    await sound.playAsync();
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

export const playButtonClick = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/button_click.mp3'));

export const playCorrect = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/correct_answer.mp3'));

export const playWrong = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/wrong_answer.mp3'), 0.25);

export const playGameComplete = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/game_complete.mp3'));

export const playNimoAppear = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/nimo_appear.mp3'));

export const playNimoDisappear = () =>
  playAndUnloadSound(require('../../../../assets/audio/sounds/nimo_disappear.mp3'));

// Temporarily commented out as level_up.mp3 is missing from the assets folder.
// export const playLevelUp = () =>
//   playAndUnloadSound(require('../../../../assets/audio/sounds/level_up.mp3'));


export default function DummyRoute() { return null; }
