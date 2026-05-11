import { LanguageMode } from "../services/languageModeService";

export interface PictureQuizWord {
  tamil_word: string;
  english_meaning: string;
  sinhala_meaning: string;
  image_url: string;
  difficulty: string;
  category: string;
}

export interface PictureQuizQuestion {
  image_url: string;
  tamil_word: string;
  english_meaning: string;
  sinhala_meaning: string;
  difficulty: string;
  category: string;
  options: string[];
}

const normalizeTamil = (value: string) => value.normalize("NFC").trim();

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const generatePictureQuizQuestion = (
  currentWord: PictureQuizWord,
  wordPool: PictureQuizWord[],
  optionCount = 3,
  langMode: LanguageMode = 'T2S'
): PictureQuizQuestion | null => {
  const isS2T = langMode === 'S2T';
  const correctWord = normalizeTamil(isS2T ? (currentWord.sinhala_meaning || "") : (currentWord.tamil_word || ""));
  if (!correctWord) {
    return null;
  }

  const uniqueWords = Array.from(new Set(wordPool.map((word) => normalizeTamil(isS2T ? (word.sinhala_meaning || "") : (word.tamil_word || ""))).filter(Boolean)));

  const wrongWords = shuffleArray(
    uniqueWords.filter((word) => word !== correctWord)
  ).slice(0, Math.max(optionCount - 1, 0));

  if (wrongWords.length < optionCount - 1) {
    return null;
  }

  let options = shuffleArray([correctWord, ...wrongWords]).slice(0, optionCount);

  // Defensive guard for malformed input sets.
  if (!options.includes(correctWord)) {
    options = [...options.slice(0, Math.max(optionCount - 1, 0)), correctWord];
    options = shuffleArray(options);
  }

  if (options.length !== optionCount) {
    return null;
  }

  return {
    image_url: currentWord.image_url,
    tamil_word: correctWord, // Keeping property name as tamil_word but it stores the correct word in the selected lang
    english_meaning: currentWord.english_meaning,
    sinhala_meaning: currentWord.sinhala_meaning,
    difficulty: currentWord.difficulty,
    category: currentWord.category,
    options,
  };
};


export default function DummyRoute() { return null; }
