import { Audio } from "expo-av";
import { getMuteState, registerStopCallback } from "./musicService";

// ──────────────────────────────────────────────
// Static require maps – one per category
// (React Native requires static require() paths)
// ──────────────────────────────────────────────

const INTRO_FILES = [
  require("../../../../assets/audio/nimo/intro/nimo_question_1.mp3"),
];

const QUESTION_FILES = [
  require("../../../../assets/audio/nimo/question/nimo_question_1.mp3"),
  require("../../../../assets/audio/nimo/question/nimo_question_2.mp3"),
  require("../../../../assets/audio/nimo/question/nimo_question_3.mp3"),
];

const HAPPY_FILES = [
  require("../../../../assets/audio/nimo/happy/nimo_happy_1.mp3"),
  require("../../../../assets/audio/nimo/happy/nimo_happy_2.mp3"),
  require("../../../../assets/audio/nimo/happy/nimo_happy_3.mp3"),
];

const SAD_FILES = [
  require("../../../../assets/audio/nimo/sad/nimo_sad_1.mp3"),
  require("../../../../assets/audio/nimo/sad/nimo_sad_2.mp3"),
  require("../../../../assets/audio/nimo/sad/nimo_sad_3.mp3"),
];

const MOTIVATION_FILES = [
  require("../../../../assets/audio/nimo/motivation/nimo_motivation_1.mp3"),
  require("../../../../assets/audio/nimo/motivation/nimo_motivation_2.mp3"),
];

const CELEBRATION_FILES = [
  require("../../../../assets/audio/nimo/celebration/nimo_celebration_1.mp3"),
  require("../../../../assets/audio/nimo/celebration/nimo_celebration_2.mp3"),
];

// ──────────────────────────────────────────────
// Shared playback helper
// ──────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;

// Register a stop callback so toggleMute can kill Nimo speech immediately
registerStopCallback(() => {
  if (currentSound) {
    currentSound.stopAsync().catch(() => {});
    currentSound.unloadAsync().catch(() => {});
    currentSound = null;
  }
});

/**
 * Pick a random file from the list, load it, and play it.
 * Automatically unloads any previously playing Nimo sound
 * so clips don't overlap.
 */
async function playRandom(files: number[]): Promise<void> {
  if (getMuteState()) return;

  try {
    // Stop & unload any currently playing sound
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }

    const pick = files[Math.floor(Math.random() * files.length)];
    const { sound } = await Audio.Sound.createAsync(pick, { shouldPlay: true });
    currentSound = sound;

    // Auto-cleanup when playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (currentSound === sound) currentSound = null;
      }
    });
  } catch (error) {
    console.warn("[NimoAudio] playback failed:", error);
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export const playIntro = () => playRandom(INTRO_FILES);
export const playQuestion = () => playRandom(QUESTION_FILES);
export const playHappy = () => playRandom(HAPPY_FILES);
export const playSad = () => playRandom(SAD_FILES);
export const playMotivation = () => playRandom(MOTIVATION_FILES);
export const playCelebration = () => playRandom(CELEBRATION_FILES);


export default function DummyRoute() { return null; }
