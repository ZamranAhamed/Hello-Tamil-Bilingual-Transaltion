/**
 * Shared utility to generate quiz options for any game
 * Takes a correct word and generates multiple choice options with wrong answers
 */
import { LanguageMode } from "../services/languageModeService";

export interface WordEntry {
  tamil: string;
  english: string;
  sinhala: string;
  difficulty: string;
  category: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  category: string;
  tamilWord: string;
  englishMeaning: string;
  sinhalaMeaning: string;
}

/**
 * Generate quiz options with 1 correct answer and 3 random wrong answers
 * Ensures no duplicate options and proper shuffling
 * @param primaryWord The word to create a quiz for (Tamil if T2S, Sinhala if S2T)
 * @param wordsDataset The full dataset of words to select wrong answers from
 * @param langMode The language mode
 * @returns Quiz question object with shuffled options, or null if word not found
 */
export const generateQuizOptions = (
  primaryWord: string,
  wordsDataset: WordEntry[],
  langMode: LanguageMode = 'T2S'
): QuizQuestion | null => {
  const isS2T = langMode === 'S2T';
  const entry = wordsDataset.find((w) => (isS2T ? w.sinhala : w.tamil) === primaryWord);
  if (!entry) {
    return null;
  }

  const correctOption = isS2T ? `${entry.english} - ${entry.tamil}` : `${entry.english} - ${entry.sinhala}`;

  // Gather wrong options from other words, filter out potential duplicates
  const otherEntries = wordsDataset.filter((w) => {
    return (
      (isS2T ? w.sinhala : w.tamil) !== primaryWord &&
      // Avoid duplicate meanings
      !(w.english === entry.english && (isS2T ? w.tamil === entry.tamil : w.sinhala === entry.sinhala))
    );
  });

  if (otherEntries.length < 3) {
    console.warn(`Not enough unique options available for word: ${primaryWord}. Found ${otherEntries.length}, need 3.`);
  }

  // Shuffle the other entries
  const shuffled = [...otherEntries].sort(() => Math.random() - 0.5);

  // Take up to 3 as wrong answers (handle case where fewer than 3 available)
  const wrongCount = Math.min(3, shuffled.length);
  const wrongEntries = shuffled.slice(0, wrongCount);
  const wrongOptions = wrongEntries.map((w) => isS2T ? `${w.english} - ${w.tamil}` : `${w.english} - ${w.sinhala}`);

  // Combine correct and wrong options, then shuffle
  const allOptions = [correctOption, ...wrongOptions];
  const finalOptions = shuffleArray(allOptions);

  return {
    question: `What is the meaning of "${primaryWord}"?`,
    options: finalOptions,
    correctAnswer: correctOption,
    difficulty: entry.difficulty,
    category: entry.category,
    tamilWord: entry.tamil,
    englishMeaning: entry.english,
    sinhalaMeaning: entry.sinhala,
  };
};

/**
 * Fisher-Yates shuffle algorithm for true randomization
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Find a word entry in the dataset by Tamil word
 * @param tamilWord The Tamil word to search for
 * @param wordsDataset The dataset to search in
 * @returns The word entry if found, null otherwise
 */
export const getTranslationEntry = (
  tamilWord: string,
  wordsDataset: WordEntry[]
): WordEntry | null => {
  return wordsDataset.find((w) => w.tamil === tamilWord) || null;
};

/**
 * Extract English and Sinhala parts from an option string
 * Format: "EnglishMeaning - SinhalaMeaning"
 * @param option The option string to parse
 * @returns {english, sinhala} object or null if invalid format
 */
export const parseOption = (option: string): { english: string; sinhala: string } | null => {
  const parts = option.split(' - ');
  if (parts.length !== 2) {
    return null;
  }
  return {
    english: parts[0].trim(),
    sinhala: parts[1].trim(),
  };
};

export default function DummyRoute() { return null; }
