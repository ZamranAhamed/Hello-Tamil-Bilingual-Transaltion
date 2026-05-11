import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { View, Text, Pressable, Platform, Alert, BackHandler, Animated, Easing, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getWords, API_URL , saveGameLog } from "../../../../services/api";
import { generateQuizOptions } from "../utils/generateQuizOptions";
import useNimo from "../hooks/useNimo";
import NimoAssistant from "../components/NimoAssistant";
import { playQuestion, playHappy, playSad, playCelebration, playMotivation } from "../services/nimoAudioService";
import { playCorrect, playWrong, playGameComplete, playButtonClick } from "../services/soundService";
import { playGameMusic, stopMusic } from "../services/musicService";
import { StarRewardProvider, showStarReward } from "../components/StarReward";
import { getLanguageMode, LanguageMode } from "../services/languageModeService";

const { width, height } = Dimensions.get("window");

type Word = {
  tamil: string;
  english: string;
  sinhala: string;
  category: string;
  difficulty: string;
};

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const shuffleArray = <T,>(items: T[]): T[] => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// 1. Animated Background
const FloatingBubbles = () => {
  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    const size = Math.random() * 60 + 30; // Different sizes
    const left = Math.random() * width;
    const animation = useRef(new Animated.Value(0)).current;
    const duration = Math.random() * 8000 + 10000;
    const delay = Math.random() * 4000;

    const colors = ["#A0C4FF", "#FFADAD", "#FDFFB6", "#CAFFBF"]; // Pastel colors
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
          opacity: 0.2, // opacity: 0.2
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

// 9. Floating Nimo
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

// 5 & 6 & 8. Animated Answer Button
const AnswerButton = ({ option, onPress, disabled, isCorrectObj }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const [buttonState, setButtonState] = useState<"normal" | "correct" | "wrong">("normal");

  const randomColor = useMemo(() => {
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
      toValue: 0.95, // scale button down to 0.95
      duration: 120, // Animation duration 120ms
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1, // bounce back to 1
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleAction = () => {
    if (disabled) return;
    const isCorrect = isCorrectObj(option);
    
    if (isCorrect) {
      setButtonState("correct");
    } else {
      setButtonState("wrong");
      // Shake animation for wrong answer
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setButtonState("normal"));
    }

    onPress(option);
  };

  const getBackgroundColor = () => {
    if (buttonState === "correct") return "#38A169"; // Green flash
    if (buttonState === "wrong") return "#E53E3E"; // Red flash
    return randomColor;
  };

  const getTextColor = () => {
    if (buttonState === "correct" || buttonState === "wrong") return "white";
    return "#333333";
  };

  return (
    <Pressable
      onPress={handleAction}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ width: "45%", margin: "2%", aspectRatio: 1 }}
    >
      <Animated.View 
        style={{ 
          transform: [{ scale }, { translateX: shakeX }],
          backgroundColor: getBackgroundColor(),
          width: "100%",
          height: "100%",
          borderRadius: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 4,
        }}
      >
        <View style={{
          flex: 1,
          borderRadius: 20,
          padding: 15,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.6)",
          overflow: "hidden", // Important for glossy effect
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

          <Text
            style={{
              color: getTextColor(),
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
              zIndex: 1, // Draw above the shine
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

export default function WordHunt({ category, playerName = "Player" }: { category?: string; playerName?: string }) {
  const router = useRouter();
  const { emotion, subtitle, visible, muteSound, showHappyMessage, showSadMessage } = useNimo();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 10;
  const [wordPool, setWordPool] = useState<Word[]>([]);
  const selectedCategory = category;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [easyCorrect, setEasyCorrect] = useState(0);
  const [mediumCorrect, setMediumCorrect] = useState(0);
  const [hardCorrect, setHardCorrect] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');

  const currentWord = words.length > 0 && currentIndex < words.length ? words[currentIndex] : null;
  const currentDifficulty = currentWord?.difficulty
    ? currentWord.difficulty.charAt(0).toUpperCase() + currentWord.difficulty.slice(1).toLowerCase()
    : "Medium";

  // Use useMemo to generate quiz options only once per question (before early returns to satisfy React Hooks rules)
  const quizData = useMemo(() => {
    if (!currentWord || wordPool.length === 0) return null;
    return generateQuizOptions(langMode === 'S2T' ? currentWord.sinhala : currentWord.tamil, wordPool, langMode);
  }, [currentWord, wordPool, langMode]);

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
      if (Platform.OS !== "android") {
        return undefined;
      }

      const onBackPress = () => {
        router.replace("/modules/bilingual_translation/games" as any);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  useEffect(() => {
    loadWords();
  }, []);

  // Nimo welcome message + audio when game starts
  useEffect(() => {
    if (!isLoading && words.length > 0) {
      showHappyMessage(
        "මේකේ නිවැරදි පිළිතුර තෝරන්න!",
        "Choose the correct answer!"
      );
      playQuestion();
    }
  }, [isLoading]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setIsAnswered(false);
  }, [currentIndex]);

  const loadWords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWords();
      
      // Map API response to Word type
      const mappedWords: Word[] = data.map((word: any) => ({
        tamil: word.tamil_word || word.tamil,
        english: word.english_meaning || word.english,
        sinhala: word.sinhala_meaning || word.sinhala,
        category: word.category || 'general',
        difficulty: word.difficulty || 'Medium',
      }));

      console.log("Fetched and mapped data:", mappedWords);

      const filteredData = selectedCategory
        ? mappedWords.filter((word: Word) => word.category === selectedCategory)
        : mappedWords;

      const sortedData = [...filteredData].sort((a: Word, b: Word) => {
        const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty?.toLowerCase() || "medium");
        const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty?.toLowerCase() || "medium");
        return aIndex - bIndex;
      });

      let recommendedDifficulty: string | null = null;
      try {
        const query = new URLSearchParams({
          player_name: playerName,
          game_type: "Word Hunt",
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
      } catch (difficultyError) {
        console.log("Difficulty fetch suppressed offline.");
      }

      let adaptiveWordPool =
        recommendedDifficulty
          ? sortedData.filter(
              (word: Word) => (word.difficulty || "").toLowerCase() === recommendedDifficulty
            )
          : [];

      if (adaptiveWordPool.length === 0) {
        const availableDifficulties = DIFFICULTY_ORDER.filter((difficulty) =>
          sortedData.some((word: Word) => (word.difficulty || "").toLowerCase() === difficulty)
        );

        if (availableDifficulties.length > 0) {
          const randomDifficulty =
            availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)];
          adaptiveWordPool = sortedData.filter(
            (word: Word) => (word.difficulty || "").toLowerCase() === randomDifficulty
          );
        }
      }

      if (adaptiveWordPool.length === 0) {
        adaptiveWordPool = sortedData;
      }

      console.log("Sorted data:", sortedData);

      const sessionWords = shuffleArray(adaptiveWordPool).slice(0, maxQuestions);
      setWordPool(adaptiveWordPool);
      setWords(sessionWords);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading words:", err);
      setError("Failed to load words. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 36, fontWeight: "bold" }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "red", fontSize: 24, marginBottom: 20, textAlign: "center" }}>{error}</Text>
        <Pressable onPress={() => { playButtonClick(); loadWords(); }} style={{ padding: 15, backgroundColor: "#4CAF50", borderRadius: 5 }}>
          <Text style={{ color: "white", fontSize: 18 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (words.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 24, textAlign: "center" }}>No words available for the selected category.</Text>
      </View>
    );
  }

  const totalQuestions = words.length;
  
  if (!currentWord || !quizData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 24, textAlign: "center" }}>Error generating quiz</Text>
      </View>
    );
  }

  const options = quizData.options;

  const isOptionCorrect = (answer: string) => {
    return answer.split(" - ")[0] === currentWord.english;
  };

  const checkAnswer = (answer: string) => {
    setIsAnswered(true);
    const selectedEnglish = answer.split(" - ")[0];
    const isCorrect = selectedEnglish === currentWord.english;
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

    // Create game log object with new schema
    const gameLog = {
      player_name: playerName,
      tamil_word: currentWord.tamil,
      english_meaning: currentWord.english,
      sinhala_meaning: currentWord.sinhala,
      selected_answer: selectedEnglish,
      correct_answer: currentWord.english,
      difficulty: currentWord.difficulty ? currentWord.difficulty.charAt(0).toUpperCase() + currentWord.difficulty.slice(1).toLowerCase() : 'Medium',
      category: currentWord.category || 'general',
      is_correct: isCorrect,
      game_type: 'Word Hunt',
      time_taken: timeTaken,
      created_at: new Date()
    };

    console.log('Game Log:', gameLog);

    // Send to backend without blocking UI interaction.
    void saveGameLog(gameLog);

    const updatedScore = isCorrect ? score + 1 : score;
    setScore(updatedScore); // Update score immediately so badge popup can trigger
    const updatedQuestion = questionCount + 1;
    const updatedWrongCount = updatedQuestion - updatedScore;

    // Update difficulty stats
    let newEasyCorrect = easyCorrect;
    let newMediumCorrect = mediumCorrect;
    let newHardCorrect = hardCorrect;

    if (isCorrect) {
      const difficultyLower = currentWord.difficulty?.toLowerCase() || "medium";
      if (difficultyLower === "easy") {
        newEasyCorrect = easyCorrect + 1;
        setEasyCorrect(newEasyCorrect);
      } else if (difficultyLower === "medium") {
        newMediumCorrect = mediumCorrect + 1;
        setMediumCorrect(newMediumCorrect);
      } else if (difficultyLower === "hard") {
        newHardCorrect = hardCorrect + 1;
        setHardCorrect(newHardCorrect);
      }
    }

    const isFinalQuestion = updatedQuestion === totalQuestions;
    const shouldShowNimo = !isFinalQuestion && (Math.random() < 1/3);

    if (isCorrect) {
      playCorrect();
      showStarReward(); // 7. Correct Answer Animation: trigger star animation ⭐
      if (shouldShowNimo) {
        setTimeout(() => {
          showHappyMessage("හරි! හොඳට කරලා තියෙනවා!", "Correct! Great job!", 2400, true);
          playHappy();
        }, 600);
      }
    } else {
      playWrong();
      if (shouldShowNimo) {
        setTimeout(() => {
          showSadMessage("අයියෝ! නැවත උත්සාහ කරමු!", "Oops! Try again!", 2400, true);
          playSad();
        }, 600);
      }
    }

    const advanceQuiz = () => {
      if (updatedQuestion === totalQuestions) {
        const accuracy = (updatedScore / totalQuestions) * 100;

        // Play end-of-game audio based on performance
        if (accuracy >= 70) {
          showHappyMessage("නියමයි! අති විශිෂ්ටයි!", "Amazing! Great job!", 3000, false);
          playCelebration();
        } else {
          showHappyMessage("උත්සාහය හොඳයි! තව දුරටත් පුහුණු වෙමු!", "Good try!", 3000, false);
          playMotivation();
        }

        const statsToSend = {
          easy: newEasyCorrect,
          medium: newMediumCorrect,
          hard: newHardCorrect,
        };

        // Delay navigating so Nimo audio can finish
        setTimeout(() => {
          playGameComplete();
          router.push({
            pathname: "/modules/bilingual_translation/games/WordHuntResultScreen",
            params: {
              score: updatedScore,
              totalQuestions: totalQuestions,
              correctCount: updatedScore,
              wrongCount: updatedWrongCount,
              accuracy: accuracy,
              difficultyStats: JSON.stringify(statsToSend),
              replayPath: "/modules/bilingual_translation/games/wordhunt",
            },
          });
        }, 3000);
        return;
      }

      setQuestionCount(updatedQuestion);
      setCurrentIndex((prev) => prev + 1);
    };

    // Briefly wait for animation before advancing
    setTimeout(() => {
        advanceQuiz();
    }, 3000);
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch ((difficulty || "").toLowerCase()) {
      case "easy":
        return "#4CAF50"; // Green
      case "medium":
        return "#FF9800"; // Orange
      case "hard":
        return "#F44336"; // Red
      default:
        return "#333333";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#EBF8FF" }}>
      <FloatingBubbles />
      
      <View
        style={{
          flex: 1,
          justifyContent: "flex-start",
          alignItems: "center",
          padding: 20,
          paddingTop: 50,
          zIndex: 1,
        }}
      >
        {/* 2. Top Score Panel */}
        <View 
          style={{ 
            backgroundColor: "#F7FAFC",
            borderRadius: 18,
            padding: 12,
            marginBottom: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
            flexDirection: "row", 
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#2D3748" }}>Score: {score} ⭐</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#4A5568" }}>
            Question: {questionCount + 1} / {totalQuestions}
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
          {/* 3. Difficulty Badge */}
          <View style={{
            backgroundColor: getDifficultyColor(currentDifficulty) + "20", // 20 for slight transparency background
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: getDifficultyColor(currentDifficulty),
          }}>
            <Text style={{ 
              fontSize: 16, 
              color: getDifficultyColor(currentDifficulty), 
              fontWeight: "bold" 
            }}>
              {currentDifficulty}
            </Text>
          </View>

          <Text style={{ fontSize: 16, color: "#718096", fontWeight: "600", alignSelf: "center" }}>
            {currentWord.category || 'General'}
          </Text>
        </View>

        {/* 4. Highlight Tamil Word */}
        <View style={{ 
          backgroundColor: "white",
          borderRadius: 25,
          paddingHorizontal: 30,
          paddingVertical: 10,
          shadowColor: "#4FD1C5",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 15,
          elevation: 8,
          marginBottom: 30,
        }}>
          <Text
            style={{
              fontSize: 44,
              fontWeight: "bold",
              color: "#2D3748",
              marginVertical: 20,
              textAlign: "center",
            }}
          >
            {langMode === 'S2T' ? currentWord.sinhala : currentWord.tamil}
          </Text>
        </View>

        {/* 10. Playful Question Card */}
        <View style={{
          backgroundColor: "white",
          padding: 14,
          borderRadius: 18,
          marginBottom: 15,
          width: "90%",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 18, color: "#4A5568", textAlign: "center", fontWeight: "bold" }}>
            What is the meaning of this word?
          </Text>
        </View>

        {/* 5, 6, 7, 8. Answer Buttons */}
        <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", flex: 1 }}>
          {options.map((option, index) => (
            <AnswerButton 
              key={`${currentIndex}-${index}`} 
              option={option} 
              onPress={() => {
                if(!isAnswered) { // Prevent multiple taps
                    playButtonClick();
                    checkAnswer(option);
                }
              }} 
              disabled={isAnswered}
              isCorrectObj={isOptionCorrect}
            />
          ))}
        </View>

        <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} muteSound={muteSound} />
        <StarRewardProvider />
      </View>
      <FloatingNimo isIntroVisible={visible} />
    </View>
  );
}
