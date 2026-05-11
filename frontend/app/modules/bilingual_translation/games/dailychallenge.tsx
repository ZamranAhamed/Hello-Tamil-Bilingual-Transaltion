import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Polyfill SecureStore using AsyncStorage to avoid encryption exceptions on certain devices/emulators
const SecureStore = {
  getItemAsync: (key: string) => AsyncStorage.getItem(key),
  setItemAsync: (key: string, value: string) => AsyncStorage.setItem(key, value),
  deleteItemAsync: (key: string) => AsyncStorage.removeItem(key),
};
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getWords, API_URL , saveGameLog } from "../../../../services/api";
import { COLORS } from "../../../../constants/colors";
import { QuizQuestion } from "../utils/generateQuizOptions";
import { playCorrect, playWrong, playGameComplete, playButtonClick } from "../services/soundService";
import { playGameMusic, stopMusic } from "../services/musicService";
import { playHappy, playSad, playQuestion } from "../services/nimoAudioService";
import { StarRewardProvider, showStarReward } from "../components/StarReward";
import useNimo from "../hooks/useNimo";
import NimoAssistant from "../components/NimoAssistant";
import { getLanguageMode, LanguageMode } from "../services/languageModeService";
import { BadgePopup } from "../components/ProgressBadge";

const { width, height } = Dimensions.get("window");

// 1. Animated Background
const FloatingBubbles = () => {
  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    const size = Math.random() * 60 + 30; // Different sizes
    const left = Math.random() * width;
    const animation = useRef(new Animated.Value(0)).current;
    const duration = Math.random() * 8000 + 10000;
    const delay = Math.random() * 4000;

    const colors = ["#A0C4FF", "#FDFFB6", "#FFADAD", "#CAFFBF"]; // light blue, yellow, pink, green
    const color = colors[i % colors.length];

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    }, [animation, duration, delay]);

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [height, -100],
    });

    return (
      <Animated.View
        key={i}
        style={{
          position: "absolute",
          left: left,
          transform: [{ translateY }],
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
    );
  });

  return (
    <View style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }} pointerEvents="none">
      {bubbles}
    </View>
  );
};

// 12. Background Sparkles
const BackgroundSparkles = () => {
  const sparkles = Array.from({ length: 6 }).map((_, i) => {
    const opacity = useRef(new Animated.Value(0.15)).current;
    const top = Math.random() * (height * 0.7);
    const left = Math.random() * width;
    const delay = Math.random() * 3000;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 1500,
            delay: delay,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          })
        ])
      ).start();
    }, [opacity, delay]);

    return (
      <Animated.View key={i} style={{ position: 'absolute', top, left, opacity }}>
        <FontAwesome name="star" size={16} color="#FFD700" />
      </Animated.View>
    );
  });

  return (
    <View style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 0 }} pointerEvents="none">
      {sparkles}
    </View>
  );
};

// 11. Floating Nimo
const FloatingNimo = ({ isIntroVisible }: { isIntroVisible?: boolean }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 80, // Size: 80
        height: 80,
        transform: [{ translateY }],
        zIndex: 10,
        opacity: isIntroVisible ? 0 : 1,
      }}
      pointerEvents={isIntroVisible ? "none" : "auto"}
    >
      <Animated.Image
        source={require("../../../../assets/images/nimo_blue_happy.png")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

// 6 & 7. Animated Answer Button
const AnswerButton = ({ option, onPress, isSelected, isCorrect, wrongShakeAnim, disabled }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const randomColor = React.useMemo(() => {
    const pastelColors = [
      "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
      "#E0BBE4", "#957DAD", "#D291BC", "#FEC8D8", "#FFDFD3",
      "#A0E6FF", "#FFF6A3", "#FFC6FF", "#BDB2FF", "#CAFFBF",
      "#FDE2E4", "#FAD2E1", "#C5DEDD", "#DBE7E4", "#F0EFEB"
    ];
    return pastelColors[Math.floor(Math.random() * pastelColors.length)];
  }, [option]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 120, // bounce animation 120ms
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  let bgColor = randomColor;
  let borderColor = "rgba(255,255,255,0.6)";
  let borderWidth = 2;
  let translateX: Animated.Value | 0 = 0;
  let textColor = "#333333";

  if (isSelected) {
    if (isCorrect) {
      bgColor = "#38A169"; 
      borderColor = "#276749";
      textColor = "white";
    } else {
      bgColor = "#F56565"; 
      borderColor = "#C53030"; 
      translateX = wrongShakeAnim; 
      textColor = "white";
    }
  } else if (disabled) {
    bgColor = "#A0AEC0"; // Gray out
    textColor = "#333333";
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={{ width: "45%", margin: "2%", aspectRatio: 1 }}
    >
      <Animated.View style={{ 
        transform: [{ scale }, { translateX }], 
        width: '100%', 
        height: '100%',
        backgroundColor: bgColor,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
      }}>
        <View style={{
          flex: 1,
          borderRadius: 20,
          padding: 15,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: borderWidth,
          borderColor: borderColor,
          overflow: "hidden", 
        }}>
          {/* Glass Glare Stripes */}
          <View style={{
            position: "absolute",
            top: "-50%",
            left: "15%",
            width: "25%",
            height: "200%",
            backgroundColor: "rgba(255, 255, 255, 0.35)",
            transform: [{ rotate: "35deg" }],
          }} />
          <View style={{
            position: "absolute",
            top: "-50%",
            left: "45%",
            width: "10%",
            height: "200%",
            backgroundColor: "rgba(255, 255, 255, 0.25)",
            transform: [{ rotate: "35deg" }],
          }} />

          <Text style={{
            color: textColor,
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            zIndex: 1,
          }}
          numberOfLines={4}
          adjustsFontSizeToFit
          >
            {option}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

interface DailyChallengeState {
  date: string;
  completed: boolean;
  score: number;
  questionsAnswered: number;
}

interface StreakData {
  count: number;
  lastDate: string;
}

interface DailyChallengeWord {
  tamil_word: string;
  english_meaning: string;
  sinhala_meaning: string;
  difficulty: string;
  category: string;
}

interface CalendarDay {
  dayNumber: number;
  date: string;
  completed: boolean;
  isToday: boolean;
}

const TOTAL_DAYS_VIEW = 30;
const TARGET_QUESTION_COUNT = 5;
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const START_DATE_KEY = "daily_challenge_start_date";

const FALLBACK_WORDS: DailyChallengeWord[] = [
  { tamil_word: "\u0B85", english_meaning: "A", sinhala_meaning: "\u0D85", difficulty: "easy", category: "letters" },
  { tamil_word: "\u0B86", english_meaning: "Aa", sinhala_meaning: "\u0D86", difficulty: "easy", category: "letters" },
  { tamil_word: "\u0B87", english_meaning: "I", sinhala_meaning: "\u0D89", difficulty: "easy", category: "letters" },
  { tamil_word: "\u0B89", english_meaning: "U", sinhala_meaning: "\u0D8B", difficulty: "easy", category: "letters" },
  { tamil_word: "\u0B95", english_meaning: "Ka", sinhala_meaning: "\u0D9A", difficulty: "medium", category: "consonants" },
  { tamil_word: "\u0B9A", english_meaning: "Cha", sinhala_meaning: "\u0DA0", difficulty: "medium", category: "consonants" },
  { tamil_word: "\u0BA4", english_meaning: "Ta", sinhala_meaning: "\u0DA7", difficulty: "medium", category: "consonants" },
  { tamil_word: "\u0BA8", english_meaning: "Na", sinhala_meaning: "\u0DB1", difficulty: "medium", category: "consonants" },
  { tamil_word: "\u0BAE", english_meaning: "Ma", sinhala_meaning: "\u0DB8", difficulty: "hard", category: "consonants" },
  { tamil_word: "\u0BB5", english_meaning: "Va", sinhala_meaning: "\u0DC0", difficulty: "hard", category: "consonants" },
];

const getDailyKey = (date: string) => `daily_challenge_${date}`;

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const getDateFromBase = (baseDate: string, offset: number): string => {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
};

const getDayDiff = (fromDate: string, toDate: string): number => {
  const from = new Date(`${fromDate}T00:00:00`).getTime();
  const to = new Date(`${toDate}T00:00:00`).getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
};

const hashDate = (dateString: string): number => {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number, index: number): number => {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
};

const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const safeParseChallengeState = (value: string | null): DailyChallengeState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DailyChallengeState;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const getDifficultyColor = (difficulty: string): string => {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return "#4CAF50";
    case "medium":
      return "#FF9800";
    case "hard":
      return "#F44336";
    default:
      return "#90A4AE";
  }
};

export default function DailyChallenge({
  playerName = "Player",
}: {
  playerName?: string;
}) {
  const router = useRouter();
  const { emotion, subtitle, visible, showHappyMessage, showSadMessage } = useNimo();

  const [viewMode, setViewMode] = useState<"overview" | "challenge">("overview");
  const [loading, setLoading] = useState(true);
  const [preparingChallenge, setPreparingChallenge] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [cycleStartDate, setCycleStartDate] = useState(getTodayString());
  const [currentDayNumber, setCurrentDayNumber] = useState(1);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [isOptionCorrect, setIsOptionCorrect] = useState<boolean | null>(null);
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');

  const wrongShakeAnim = useRef(new Animated.Value(0)).current;
  const [showRewardBadge, setShowRewardBadge] = useState(false);
  const rewardScale = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setLangMode(getLanguageMode());
      void playGameMusic();
      return () => {
        void stopMusic();
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;

      const onBackPress = () => {
        router.replace("/modules/bilingual_translation/games");
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  useEffect(() => {
    void refreshOverviewData();
  }, []);

  useEffect(() => {
    if (viewMode === "challenge") {
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, viewMode]);

  const normalizeWords = (rawWords: any): DailyChallengeWord[] => {
    const safeWords = Array.isArray(rawWords) ? rawWords : [];

    return safeWords
      .map((word: any) => ({
        tamil_word: word?.tamil_word || word?.tamil || "",
        english_meaning: word?.english_meaning || word?.english || "",
        sinhala_meaning: word?.sinhala_meaning || word?.sinhala || "",
        category: (word?.category || "general").toLowerCase(),
        difficulty: (word?.difficulty || "medium").toLowerCase(),
      }))
      .filter((word: DailyChallengeWord) => Boolean(word.tamil_word && word.english_meaning && word.sinhala_meaning));
  };

  const loadDailyStreak = async (): Promise<number> => {
    try {
      const streakJson = await SecureStore.getItemAsync("daily_streak");
      if (!streakJson) {
        setDailyStreak(0);
        return 0;
      }

      const parsed = JSON.parse(streakJson) as StreakData;
      if (!parsed || typeof parsed.count !== "number") {
        setDailyStreak(0);
        return 0;
      }

      setDailyStreak(parsed.count);
      return parsed.count;
    } catch (error) {
      console.error("Error loading streak:", error);
      setDailyStreak(0);
      return 0;
    }
  };

  const ensureCycleStartDate = async (): Promise<string> => {
    const today = getTodayString();
    try {
      const stored = await SecureStore.getItemAsync(START_DATE_KEY);
      if (!stored) {
        await SecureStore.setItemAsync(START_DATE_KEY, today);
        return today;
      }

      // Guard against invalid/future dates in storage.
      if (getDayDiff(stored, today) < 0) {
        await SecureStore.setItemAsync(START_DATE_KEY, today);
        return today;
      }

      return stored;
    } catch {
      return today;
    }
  };

  const loadCalendar = async (startDate: string) => {
    const today = getTodayString();
    const dates = Array.from({ length: TOTAL_DAYS_VIEW }, (_, idx) =>
      getDateFromBase(startDate, idx)
    );

    const states = await Promise.all(
      dates.map(async (date) => {
        try {
          const value = await SecureStore.getItemAsync(getDailyKey(date));
          const parsed = safeParseChallengeState(value);
          return Boolean(parsed?.completed);
        } catch {
          return false;
        }
      })
    );

    const days: CalendarDay[] = dates.map((date, index) => ({
      dayNumber: index + 1,
      date,
      completed: states[index],
      isToday: date === today,
    }));

    const completedToday = days.some((day) => day.isToday && day.completed);
    setCalendarDays(days);
    setTodayCompleted(completedToday);
    setCycleStartDate(startDate);

    const dayDiff = getDayDiff(startDate, today);
    setCurrentDayNumber(Math.max(1, dayDiff + 1));
  };

  const refreshOverviewData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const startDate = await ensureCycleStartDate();
      await Promise.all([loadDailyStreak(), loadCalendar(startDate)]);
    } catch (error) {
      console.error("Failed to refresh daily challenge overview:", error);
      setLoadError("Failed to load daily challenge progress.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWordsWithFallback = async (): Promise<DailyChallengeWord[]> => {
    let words: DailyChallengeWord[] = [];

    try {
      const rawWordsData = await getWords();
      words = normalizeWords(rawWordsData);
    } catch (error) {
      console.log("Primary daily challenge words fetch suppressed offline.");
    }

    if (words.length > 0) {
      return words;
    }

    try {
      const response = await fetch(`${API_URL}/translation/words`);
      const rawFallbackData = response.ok ? await response.json() : [];
      words = normalizeWords(rawFallbackData);
    } catch (error) {
      console.log("Fallback words collection fetch suppressed offline.");
    }

    if (words.length > 0) {
      return words;
    }

    return seededShuffle(FALLBACK_WORDS, hashDate(getTodayString()) + 99);
  };

  const applyAdaptiveDifficulty = async (
    words: DailyChallengeWord[]
  ): Promise<DailyChallengeWord[]> => {
    if (!Array.isArray(words) || words.length === 0) {
      return words;
    }

    let recommendedDifficulty: string | null = null;

    try {
      const query = new URLSearchParams({
        player_name: playerName,
        game_type: "Daily Challenge",
      });
      const response = await fetch(
        `${API_URL}/game-logs/recommended-difficulty?${query.toString()}`
      );

      if (response.ok) {
        const payload = await response.json();
        const apiDifficulty = String(payload?.recommendedDifficulty || "").toLowerCase();
        if (DIFFICULTY_ORDER.includes(apiDifficulty)) {
          recommendedDifficulty = apiDifficulty;
        }
      }
    } catch (error) {
      console.log("Failed to fetch recommended difficulty, suppressed offline.");
    }

    let adaptiveWords =
      recommendedDifficulty
        ? words.filter((word) => (word.difficulty || "").toLowerCase() === recommendedDifficulty)
        : [];

    if (adaptiveWords.length === 0) {
      const availableDifficulties = DIFFICULTY_ORDER.filter((difficulty) =>
        words.some((word) => (word.difficulty || "").toLowerCase() === difficulty)
      );

      if (availableDifficulties.length > 0) {
        const randomDifficulty =
          availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)];
        adaptiveWords = words.filter(
          (word) => (word.difficulty || "").toLowerCase() === randomDifficulty
        );
      }
    }

    return adaptiveWords.length > 0 ? adaptiveWords : words;
  };

  const createQuestionOptions = (word: DailyChallengeWord, allWords: DailyChallengeWord[], currentLangMode: LanguageMode): string[] => {
    const isS2T = currentLangMode === 'S2T';
    const primaryWordStr = isS2T ? word.sinhala_meaning : word.tamil_word;
    const correctOption = isS2T ? `${word.english_meaning} - ${word.tamil_word}` : `${word.english_meaning} - ${word.sinhala_meaning}`;
    
    const otherWords = allWords.filter(
      (w) =>
        (isS2T ? w.sinhala_meaning : w.tamil_word) !== primaryWordStr &&
        (isS2T ? `${w.english_meaning} - ${w.tamil_word}` : `${w.english_meaning} - ${w.sinhala_meaning}`) !== correctOption
    );

    const shuffledOthers = seededShuffle(
      otherWords,
      hashDate(getTodayString()) + word.tamil_word.length
    );
    const wrongOptions = shuffledOthers
      .slice(0, 3)
      .map((w) => isS2T ? `${w.english_meaning} - ${w.tamil_word}` : `${w.english_meaning} - ${w.sinhala_meaning}`);
    const options = [correctOption, ...wrongOptions];

    return seededShuffle(
      options,
      hashDate(getTodayString()) + options.length + word.tamil_word.charCodeAt(0)
    );
  };

  const getSeededRandomItems = <T,>(array: T[], count: number, seed: number, offset: number): T[] => {
    const shuffled = seededShuffle(array, seed + offset);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  const generateDailyQuestions = (allWords: DailyChallengeWord[] | undefined, currentLangMode: LanguageMode): QuizQuestion[] => {
    const safeWords = Array.isArray(allWords) && allWords.length > 0 ? allWords : FALLBACK_WORDS;

    if (!Array.isArray(safeWords) || safeWords.length === 0) {
      return [];
    }

    const dateSeed = hashDate(getTodayString());
    const easyWords = safeWords.filter((w) => (w.difficulty || "").toLowerCase() === "easy");
    const mediumWords = safeWords.filter((w) => (w.difficulty || "").toLowerCase() === "medium");
    const hardWords = safeWords.filter((w) => (w.difficulty || "").toLowerCase() === "hard");

    const preferredSelection: DailyChallengeWord[] = [
      ...getSeededRandomItems(easyWords, 2, dateSeed, 1),
      ...getSeededRandomItems(mediumWords, 2, dateSeed, 2),
      ...getSeededRandomItems(hardWords, 1, dateSeed, 3),
    ];

    const selectedMap = new Map(preferredSelection.map((word) => [word.tamil_word, word]));
    const selected = Array.from(selectedMap.values());

    if (selected.length < TARGET_QUESTION_COUNT) {
      const remaining = safeWords.filter((word) => !selectedMap.has(word.tamil_word));
      const backfill = getSeededRandomItems(
        remaining,
        TARGET_QUESTION_COUNT - selected.length,
        dateSeed,
        4
      );
      selected.push(...backfill);
    }

    const shuffled = seededShuffle(selected, dateSeed);
    const repeatedSelection: DailyChallengeWord[] = [];
    for (let i = 0; i < TARGET_QUESTION_COUNT; i++) {
      repeatedSelection.push(shuffled[i % shuffled.length]);
    }

    return repeatedSelection.map((word) => {
      const isS2T = currentLangMode === 'S2T';
      const correctAnswer = isS2T ? `${word.english_meaning} - ${word.tamil_word}` : `${word.english_meaning} - ${word.sinhala_meaning}`;
      return {
        question: `What is the meaning of "${isS2T ? word.sinhala_meaning : word.tamil_word}"?`,
        options: createQuestionOptions(word, safeWords, currentLangMode),
        tamilWord: isS2T ? word.sinhala_meaning : word.tamil_word,
        correctAnswer,
        difficulty: word.difficulty,
        category: word.category,
        englishMeaning: word.english_meaning,
        sinhalaMeaning: word.sinhala_meaning,
      };
    });
  };

  const prepareTodayChallenge = async () => {
    if (todayCompleted) {
      setBannerMessage("Today's challenge is already completed.");
      return;
    }

    try {
      setPreparingChallenge(true);
      setLoadError(null);
      setBannerMessage(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedAnswer("");
      setShowResult(false);
      setIsCompleting(false);

      const words = await fetchWordsWithFallback();
      const adaptiveWords = await applyAdaptiveDifficulty(words);

      let dailyQuestions = generateDailyQuestions(adaptiveWords, getLanguageMode());
      if (dailyQuestions.length === 0) {
        dailyQuestions = generateDailyQuestions(words, getLanguageMode());
      }
      if (dailyQuestions.length === 0) {
        dailyQuestions = generateDailyQuestions(FALLBACK_WORDS, getLanguageMode());
      }

      if (dailyQuestions.length === 0) {
        setLoadError("Could not build daily challenge questions.");
        return;
      }

      setQuestions(dailyQuestions);
      setViewMode("challenge");
    } catch (error) {
      console.error("Error preparing daily challenge:", error);
      setLoadError("Failed to start challenge. Please try again.");
    } finally {
      setPreparingChallenge(false);
    }
  };
  const sendGameLog = async (
    tamilWord: string,
    englishMeaning: string,
    sinhalaMeaning: string,
    selectedAnswerText: string,
    correctAnswerText: string,
    difficulty: string,
    category: string,
    isCorrect: boolean
  ) => {
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    const gameLog = {
      player_name: playerName,
      tamil_word: tamilWord,
      english_meaning: englishMeaning,
      sinhala_meaning: sinhalaMeaning,
      selected_answer: selectedAnswerText,
      correct_answer: correctAnswerText,
      difficulty,
      category,
      is_correct: isCorrect,
      game_type: "Daily Challenge",
      time_taken: timeTaken,
      created_at: new Date(),
    };

    await saveGameLog(gameLog);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    setSelectedAnswer(answer);

    const currentQuestion = questions[currentQuestionIndex];
    const selectedEnglish = answer.split(" - ")[0];
    const correctEnglish = currentQuestion.correctAnswer.split(" - ")[0];
    const isCorrect = selectedEnglish === correctEnglish;
    
    setIsOptionCorrect(isCorrect);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      playCorrect();
      showStarReward();

      // Nimo appears randomly (~33% chance) and delayed by 1s to let sound play first
      if (Math.random() < 0.33) {
        setTimeout(() => {
          playHappy();
          showHappyMessage("හරි! හොඳට කරලා තියෙනවා!", "Correct! Great job!");
        }, 1000);
      }
    } else {
      playWrong();

      // Nimo appears randomly (~33% chance) and delayed by 1s to let sound play first
      if (Math.random() < 0.33) {
        setTimeout(() => {
          playSad();
          showSadMessage("අයියෝ! නැවත උත්සාහ කරමු!", "Oops! Try again!");
        }, 1000);
      }

      // 9. Shake button horizontally
      Animated.sequence([
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    void sendGameLog(
      currentQuestion.tamilWord,
      currentQuestion.englishMeaning,
      currentQuestion.sinhalaMeaning,
      selectedEnglish,
      correctEnglish,
      currentQuestion.difficulty,
      currentQuestion.category,
      isCorrect
    );

    setTimeout(() => {
      setShowResult(true);
      setIsAnswerLocked(false);
    }, 3000);
  };

  const completeDailyChallenge = async () => {
    const today = getTodayString();
    const dailyKey = getDailyKey(today);
    const state: DailyChallengeState = {
      date: today,
      completed: true,
      score,
      questionsAnswered: questions.length,
    };

    try {
      await SecureStore.setItemAsync(dailyKey, JSON.stringify(state));

      const streakJson = await SecureStore.getItemAsync("daily_streak");
      let newStreak = 1;

      if (streakJson) {
        try {
          const streak = JSON.parse(streakJson) as StreakData;
          const lastDate = streak.lastDate;

          if (lastDate === today) {
            newStreak = streak.count;
          } else {
            const lastDay = new Date(lastDate);
            const todayDate = new Date(today);
            const timeDiff = todayDate.getTime() - lastDay.getTime();
            const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            newStreak = dayDiff === 1 ? streak.count + 1 : 1;
          }
        } catch {
          newStreak = 1;
        }
      }

      await SecureStore.setItemAsync(
        "daily_streak",
        JSON.stringify({ count: newStreak, lastDate: today })
      );

      setDailyStreak(newStreak);
      setTodayCompleted(true);
      playGameComplete();
      
      // 10. Show Reward Badge
      setShowRewardBadge(true);
      Animated.spring(rewardScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error("Error completing daily challenge:", error);
      setBannerMessage("Challenge completed, but saving progress failed.");
      setViewMode("overview");
      setShowResult(false);
      setSelectedAnswer("");
      setCurrentQuestionIndex(0);
      setQuestions([]);
      void refreshOverviewData();
    } finally {
      setIsCompleting(false);
    }
  };

  const closeRewardBadge = () => {
    setShowRewardBadge(false);
    setViewMode("overview");
    setShowResult(false);
    setSelectedAnswer("");
    setCurrentQuestionIndex(0);
    setQuestions([]);
    void refreshOverviewData();
  };

  const handleNextQuestion = async () => {
    if (isCompleting) {
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setShowResult(false);
      return;
    }

    setIsCompleting(true);
    if (score === questions.length) {
      await completeDailyChallenge();
    } else {
      setBannerMessage("You must get all answers correct to complete the challenge. Please try again!");
      setViewMode("overview");
      setShowResult(false);
      setSelectedAnswer("");
      setCurrentQuestionIndex(0);
      setQuestions([]);
      void refreshOverviewData();
    }
    setIsCompleting(false);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const performReset = async () => {
    try {
      // Clear all daily challenge keys for the old 30-day range
      const oldStartDate = cycleStartDate;
      const clearPromises = Array.from({ length: TOTAL_DAYS_VIEW }, (_, idx) => {
        const date = getDateFromBase(oldStartDate, idx);
        return SecureStore.deleteItemAsync(getDailyKey(date)).catch(() => {});
      });
      await Promise.all(clearPromises);

      // Reset start date to today
      const today = getTodayString();
      await SecureStore.setItemAsync(START_DATE_KEY, today);

      // Reset streak
      await SecureStore.setItemAsync(
        "daily_streak",
        JSON.stringify({ count: 0, lastDate: "" })
      );

      // Refresh the overview
      setDailyStreak(0);
      setTodayCompleted(false);
      setShowResetConfirm(false);
      setBannerMessage("Plan has been reset. Day 1 starts today!");
      await refreshOverviewData();
    } catch (error) {
      console.error("Error resetting plan:", error);
      setShowResetConfirm(false);
      setBannerMessage("Failed to reset plan. Please try again.");
    }
  };

  const renderOverview = () => {
    const todayTile = calendarDays.find((day) => day.isToday);
    const todayStatus = todayTile?.completed ? "Completed" : "Pending";
    const todayStatusColor = todayTile?.completed ? "#2E7D32" : "#E65100";

    return (
      <View style={{ flex: 1, backgroundColor: '#EBF8FF' }}>
        <FloatingBubbles />
        <BackgroundSparkles />
        
        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* 2. Gradient Header */}
          <LinearGradient
            colors={['#F6AD55', '#ED8936']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>🔥 Daily Challenge</Text>
            <Text style={styles.headerSubtitle}>Complete today's challenge and earn stars!</Text>
          </LinearGradient>
          
          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.streakCard}>
              <Text style={{ fontSize: 26 }}>🔥</Text>
              <Text style={styles.streakText}>Streak: {dailyStreak} Days</Text>
            </View>

        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 8 }}>
            Today
          </Text>
          <Text style={{ color: todayStatusColor, fontWeight: "700" }}>{todayStatus}</Text>
          <Text style={{ color: COLORS.text, marginTop: 4 }}>Date: {getTodayString()}</Text>
        </View>

        {bannerMessage ? (
          <View
            style={{
              backgroundColor: "#E8F5E9",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#1B5E20", fontWeight: "600" }}>{bannerMessage}</Text>
          </View>
        ) : null}

        {loadError ? (
          <View
            style={{
              backgroundColor: "#FDECEA",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#B71C1C" }}>{loadError}</Text>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.navy, marginBottom: 12 }}>
            30-Day Calendar
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {calendarDays.map((day) => {
              const tileColor = day.completed ? "#4CAF50" : day.isToday ? "#FF9800" : "#CFD8DC";
              const textColor = day.completed || day.isToday ? "#FFFFFF" : "#37474F";
              const canStartToday = day.isToday && !todayCompleted;

              return (
                <Pressable
                  key={day.date}
                  disabled={!canStartToday}
                  onPress={() => {
                    void prepareTodayChallenge();
                  }}
                  style={{
                    width: "18%",
                    borderRadius: 8,
                    marginBottom: 10,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: tileColor,
                    borderWidth: day.isToday ? 2 : 0,
                    borderColor: day.isToday ? COLORS.navy : "transparent",
                    opacity: canStartToday ? 1 : 0.95,
                  }}
                >
                  <Text style={{ color: textColor, fontWeight: "700", fontSize: 12 }}>D{day.dayNumber}</Text>
                  <Text style={{ color: textColor, fontSize: 10, marginTop: 2 }}>{day.date.slice(5)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#4CAF50", marginRight: 6 }} />
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "600" }}>Completed</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#FF9800", marginRight: 6 }} />
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "600" }}>Today</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#CFD8DC", marginRight: 6 }} />
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "600" }}>Not Completed</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            playButtonClick();
            void prepareTodayChallenge();
          }}
          disabled={todayCompleted || preparingChallenge}
          style={{
            backgroundColor: todayCompleted ? "#B0BEC5" : COLORS.navy,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: preparingChallenge ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            {todayCompleted
              ? "Today's Challenge Completed"
              : preparingChallenge
                ? "Preparing Challenge..."
                : "Start Today's Challenge"}
          </Text>
        </Pressable>

        {!showResetConfirm ? (
          <Pressable
            onPress={() => setShowResetConfirm(true)}
            style={({ pressed }) => ({
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: "#F44336",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: "#F44336", fontSize: 16, fontWeight: "700" }}>
              Reset Plan
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#FFF3E0",
              borderRadius: 10,
              padding: 16,
              borderWidth: 1,
              borderColor: "#FF9800",
            }}
          >
            <Text style={{ color: COLORS.navy, fontSize: 14, fontWeight: "600", marginBottom: 12, textAlign: "center" }}>
              Are you sure? All progress will be lost and Day 1 will start from today.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShowResetConfirm(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: "#B0BEC5",
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { void performReset(); }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: "#F44336",
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>Yes, Reset</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => {
            router.replace("/modules/bilingual_translation/games" as any);
          }}
          style={({ pressed }) => ({
            backgroundColor: COLORS.teal,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            Go Back to Games
          </Text>
        </Pressable>
        </View>
      </ScrollView>
      <StarRewardProvider />
      <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} />
      <FloatingNimo isIntroVisible={visible} />
      
    </View>
    );
  };
  const renderChallenge = () => {
    if (questions.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg }}>
          <Text style={{ color: COLORS.text }}>No challenge questions available.</Text>
          <Pressable
            onPress={() => {
              playButtonClick();
              setViewMode("overview");
            }}
            style={{ marginTop: 12, backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Back to Calendar</Text>
          </Pressable>
        </View>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
    const answeredCorrectly = selectedAnswer === currentQuestion.correctAnswer;
    const currentDifficultyLabel = currentQuestion.difficulty
      ? currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1).toLowerCase()
      : "Medium";

    return (
      <View style={{ flex: 1, backgroundColor: '#EBF8FF' }}>
        <FloatingBubbles />
        <BackgroundSparkles />
        
        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <LinearGradient
            colors={['#F6AD55', '#ED8936']}
            style={[styles.headerGradient, { height: 100 }]}
          >
            <Text style={styles.headerTitle}>Today's Challenge</Text>
          </LinearGradient>

          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ marginBottom: 24, paddingHorizontal: 24 }}>
              <View style={{ backgroundColor: COLORS.card, borderRadius: 8, overflow: "hidden", height: 8 }}>
                <View
                  style={{
                    backgroundColor: COLORS.teal,
                    height: "100%",
                    width: `${progressPercent}%`,
                  }}
                />
              </View>
              <Text style={{ textAlign: 'center', marginTop: 8, color: COLORS.navy, fontWeight: '700' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>Choose the correct meaning of this {langMode === 'S2T' ? 'Sinhala' : 'Tamil'} word</Text>
            </View>

            {/* 5. Tamil Word */}
            <Text style={styles.tamilWord}>{currentQuestion.tamilWord}</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
              {currentQuestion.options.map((option, index) => (
                <AnswerButton
                  key={index}
                  option={option}
                  isSelected={selectedAnswer === option}
                  isCorrect={isOptionCorrect}
                  wrongShakeAnim={wrongShakeAnim}
                  disabled={isAnswerLocked || showResult}
                  onPress={() => {
                    if (!showResult && !isAnswerLocked) {
                      playButtonClick();
                      handleAnswerSelect(option);
                    }
                  }}
                />
              ))}
            </View>

            {showResult && (
              <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: answeredCorrectly ? "#D4EDDA" : "#F8D7DA" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name={answeredCorrectly ? "check-circle" : "close-circle"}
                    size={20}
                    color={answeredCorrectly ? "#2E7D32" : "#C62828"}
                  />
                  <Text
                    style={{
                      color: answeredCorrectly ? "#155724" : "#721C24",
                      fontWeight: "700",
                      fontSize: 16,
                      marginLeft: 6,
                    }}
                  >
                    {answeredCorrectly ? "Correct!" : "Incorrect"}
                  </Text>
                </View>
                {selectedAnswer !== currentQuestion.correctAnswer && (
                  <Text style={{ color: "#721C24", marginTop: 4, fontSize: 14 }}>
                    Correct: {currentQuestion.correctAnswer}
                  </Text>
                )}
              </View>
            )}
          </View>

        <View style={{ paddingHorizontal: 20 }}>
          {showResult ? (
            <Pressable
              onPress={() => {
                playButtonClick();
                void handleNextQuestion();
              }}
              disabled={isCompleting}
              style={{
                backgroundColor: COLORS.navy,
                padding: 16,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 20,
                opacity: isCompleting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                {isCompleting ? "Completing..." : isLastQuestion ? "Complete Challenge" : "Next Question"}
              </Text>
            </Pressable>
          ) : null}

          <View style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 4 }}>Current Score</Text>
            <Text style={{ fontSize: 32, fontWeight: "700", color: COLORS.teal }}>
              {score}/{questions.length}
            </Text>
          </View>
        </View>
      </ScrollView>
      <StarRewardProvider />
      <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} />
      <FloatingNimo isIntroVisible={visible} />
    </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#EBF8FF' }}>
        <FloatingBubbles />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={{ marginTop: 12, color: COLORS.text }}>Loading daily challenge...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF8FF' }}>
      {viewMode === "overview" ? renderOverview() : renderChallenge()}

      {/* 10. Daily Reward Badge Modal */}
      <Modal visible={showRewardBadge} transparent={true} animationType="fade">
        <View style={styles.rewardModalContainer}>
          <BadgePopup correctCount={score} />
          <Animated.View style={[styles.rewardCard, { transform: [{ scale: rewardScale }] }]}>
            <MaterialCommunityIcons name="star-circle" size={80} color="#FFD700" />
            <Text style={styles.rewardTitle}>🎁 Daily Challenge Completed!</Text>
            <Text style={styles.rewardSubtitle}>You earned new stars for today's streak.</Text>
            <Pressable style={styles.rewardButton} onPress={closeRewardBadge}>
              <Text style={styles.rewardButtonText}>Awesome!</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
    paddingTop: 30, // Account for notch
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#FFF5F5',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 14,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    textAlign: 'center',
  },
  tamilWord: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#2D3748',
    textAlign: 'center',
    marginVertical: 20,
  },
  answerButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  answerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  rewardModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    width: '85%',
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 16,
    textAlign: 'center',
  },
  rewardSubtitle: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  rewardButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  rewardButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
