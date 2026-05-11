import { useCallback, useEffect, useState, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, Pressable, Image, Platform, BackHandler, Animated, Easing, Dimensions, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { API_URL, getPictureQuizWords , saveGameLog } from "../../../../services/api";
import {
  generatePictureQuizQuestion,
  PictureQuizQuestion,
  PictureQuizWord,
} from "../utils/quizGenerator";
import useNimo from "../hooks/useNimo";
import NimoAssistant from "../components/NimoAssistant";
import { playQuestion, playHappy, playSad, playCelebration, playMotivation } from "../services/nimoAudioService";
import { playCorrect, playWrong, playGameComplete, playButtonClick } from "../services/soundService";
import { playGameMusic, stopMusic } from "../services/musicService";
import { StarRewardProvider, showStarReward } from "../components/StarReward";
import { COLORS } from "../../../../constants/colors";
import { getLanguageMode, LanguageMode } from "../services/languageModeService";

const { width, height } = Dimensions.get("window");

const BASE_URL = API_URL.replace(/\/api$/, "");
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const OPTIONS_PER_QUESTION = 3;

const getImageSource = (imageUrl: any) => {
  if (typeof imageUrl === 'number') return imageUrl;
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return { uri: imageUrl };
  return { uri: imageUrl.startsWith("/") ? `${BASE_URL}${imageUrl}` : `${BASE_URL}/${imageUrl}` };
};

const normalizeTamil = (value: string) => value.normalize("NFC").trim();

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 1. Animated Background Bubbles
const FloatingBubbles = () => {
  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    const size = Math.random() * 60 + 30; // Different sizes
    const left = Math.random() * width;
    const animation = useRef(new Animated.Value(0)).current;
    const duration = Math.random() * 8000 + 10000;
    const delay = Math.random() * 4000;

    const colors = ["#A0C4FF", "#FFADAD", "#FDFFB6", "#CAFFBF"]; // Light blue, pink, yellow, green
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

// 11. Background Sparkles
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

// 10. Floating Nimo
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

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 120, // 7. Animation duration: 120ms
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

  // Determine button styles based on state
  let bgColor = "#48BB78"; // Default green
  let borderColor = "transparent";
  let borderWidth = 0;
  let translateX: Animated.Value | 0 = 0;

  if (isSelected) {
    if (isCorrect) {
      bgColor = "#38A169"; // 8. Flash green
      borderColor = "#276749";
      borderWidth = 3;
    } else {
      bgColor = "#F56565"; 
      borderColor = "#C53030"; // 9. Red border flash
      borderWidth = 3;
      translateX = wrongShakeAnim; // 9. Shake button horizontally
    }
  } else if (disabled) {
    // Other buttons when an answer is selected
    bgColor = "#A0AEC0"; // Gray out
  }

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Animated.View style={{ 
        transform: [{ scale }, { translateX }], 
        width: '80%', 
        marginVertical: 8 
      }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={disabled}
          style={[
            styles.answerButton,
            { backgroundColor: bgColor, borderColor: borderColor, borderWidth: borderWidth }
          ]}
        >
          <Text style={styles.answerText}>{option}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};


export default function PictureQuiz({ category, playerName = "Player" }: { category?: string; playerName?: string }) {
  const router = useRouter();
  const { emotion, subtitle, visible, muteSound, showHappyMessage, showSadMessage } = useNimo();
  const [questions, setQuestions] = useState<PictureQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 5;
  const totalQuestions = Math.min(maxQuestions, questions.length);
  const selectedCategory = category;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [easyCorrect, setEasyCorrect] = useState(0);
  const [mediumCorrect, setMediumCorrect] = useState(0);
  const [hardCorrect, setHardCorrect] = useState(0);
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');

  // Animation states
  const imageScale = useRef(new Animated.Value(1)).current;
  const wrongShakeAnim = useRef(new Animated.Value(0)).current;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isOptionCorrect, setIsOptionCorrect] = useState<boolean | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);

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

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPictureQuizWords();

      const mappedWords: PictureQuizWord[] = data
        .map((word: any) => ({
          tamil_word: normalizeTamil(String(word.tamil_word || word.tamil || "")),
          english_meaning: String(word.english_meaning || word.english || "").trim(),
          sinhala_meaning: String(word.sinhala_meaning || word.sinhala || "").trim(),
          image_url: word.image_url || word.imageUrl || "",
          category: String(word.category || "general").trim(),
          difficulty: String(word.difficulty || "Medium").trim(),
        }))
        .filter((word: PictureQuizWord) => Boolean(word.tamil_word && word.image_url));

      const filteredData = selectedCategory
        ? mappedWords.filter((word: PictureQuizWord) => word.category === selectedCategory)
        : mappedWords;

      const sortedData = [...filteredData].sort((a: PictureQuizWord, b: PictureQuizWord) => {
        const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty?.toLowerCase() || "medium");
        const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty?.toLowerCase() || "medium");
        return aIndex - bIndex;
      });

      let recommendedDifficulty: string | null = null;
      let previouslyCorrectWords = new Set<string>();

      try {
        const logsStr = await AsyncStorage.getItem('game_logs');
        const allLogs = logsStr ? JSON.parse(logsStr) : [];
        const pictureLogs = allLogs.filter((log: any) => log.game_type === 'Picture Quiz');

        // Build previously correct words from local logs
        pictureLogs.forEach((log: any) => {
          if (log.is_correct && log.tamil_word) {
            previouslyCorrectWords.add(normalizeTamil(log.tamil_word));
          }
        });

        // Determine recommended difficulty from local logs
        if (pictureLogs.length >= 5) {
          const correct = pictureLogs.filter((l: any) => l.is_correct).length;
          const accuracy = correct / pictureLogs.length;
          if (accuracy >= 0.8) recommendedDifficulty = 'hard';
          else if (accuracy >= 0.5) recommendedDifficulty = 'medium';
          else recommendedDifficulty = 'easy';
        }
      } catch (difficultyError) {
        console.log("Difficulty fetch suppressed offline.");
      }

      if (sortedData.length < OPTIONS_PER_QUESTION) {
        setQuestions([]);
        setError("Picture Quiz needs at least 3 words with images in total to function.");
        setIsLoading(false);
        return;
      }

      let unmasteredWords = sortedData.filter(
        word => !previouslyCorrectWords.has(word.tamil_word)
      );

      // If no unmastered words, let the player play with all words again
      if (unmasteredWords.length === 0) {
        unmasteredWords = sortedData;
      }

      let adaptiveData = unmasteredWords;
      if (recommendedDifficulty) {
        const difficultyMatch = unmasteredWords.filter(
          (word: PictureQuizWord) => (word.difficulty || "").toLowerCase() === recommendedDifficulty
        );
        if (difficultyMatch.length >= maxQuestions) {
          adaptiveData = difficultyMatch;
        }
      }

      let randomWords = shuffleArray(adaptiveData);

      // Prevent repeated images in the same game session.
      let uniqueImageWordsMap = new Map();
      
      for (const word of randomWords) {
        const key = typeof word.image_url === 'number' ? word.image_url : String(word.image_url).toLowerCase();
        if (!uniqueImageWordsMap.has(key)) {
          uniqueImageWordsMap.set(key, word);
        }
      }

      // Backfill from all available words if we still don't have enough to reach maxQuestions
      if (uniqueImageWordsMap.size < maxQuestions) {
        const allRandomWords = shuffleArray(sortedData);
        for (const word of allRandomWords) {
          if (uniqueImageWordsMap.size >= maxQuestions) break;
          const key = typeof word.image_url === 'number' ? word.image_url : String(word.image_url).toLowerCase();
          if (!uniqueImageWordsMap.has(key)) {
            uniqueImageWordsMap.set(key, word);
          }
        }
      }

      const questionWords = Array.from(uniqueImageWordsMap.values()).slice(0, maxQuestions);

      // Build questions using sortedData (all words) for options pool so we never run out of wrong options
      const builtQuestions = questionWords
        .map((word: PictureQuizWord) =>
          generatePictureQuizQuestion(word, sortedData, OPTIONS_PER_QUESTION, getLanguageMode())
        )
        .filter((question): question is PictureQuizQuestion => Boolean(question));

      if (builtQuestions.length === 0) {
        setQuestions([]);
        setError("Not enough unique Tamil words to build options.");
        setIsLoading(false);
        return;
      }

      setQuestions(builtQuestions);
      setCurrentIndex(0);
      setScore(0);
      setQuestionCount(0);
      setEasyCorrect(0);
      setMediumCorrect(0);
      setHardCorrect(0);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading words:", err);
      setError("Failed to load picture quiz words. Please check your connection and try again.");
      setIsLoading(false);
    }
  }, [playerName, selectedCategory]);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  // Nimo welcome message + audio when game starts
  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      showHappyMessage(
        "පින්තූරය බලලා නිවැරදි වචනය තෝරන්න!",
        "Look at the picture and choose the correct word!"
      );
      playQuestion();
    }
  }, [isLoading]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);


  const checkAnswer = async (answer: string) => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    setSelectedOption(answer);

    const isCorrect = normalizeTamil(answer) === normalizeTamil(currentQuestion.tamil_word);
    setIsOptionCorrect(isCorrect);

    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

    const gameLog = {
      player_name: playerName,
      tamil_word: currentQuestion.tamil_word,
      english_meaning: currentQuestion.english_meaning,
      sinhala_meaning: currentQuestion.sinhala_meaning,
      selected_answer: answer,
      correct_answer: currentQuestion.tamil_word,
      difficulty: currentQuestion.difficulty
        ? currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1).toLowerCase()
        : "Medium",
      category: currentQuestion.category || "general",
      is_correct: isCorrect,
      game_type: "Picture Quiz",
      time_taken: timeTaken,
      created_at: new Date(),
    };

    await saveGameLog(gameLog);

    const updatedScore = isCorrect ? score + 1 : score;
    const updatedQuestion = questionCount + 1;
    const updatedWrongCount = updatedQuestion - updatedScore;

    let newEasyCorrect = easyCorrect;
    let newMediumCorrect = mediumCorrect;
    let newHardCorrect = hardCorrect;

    if (isCorrect) {
      const difficultyLower = currentQuestion.difficulty?.toLowerCase() || "medium";
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

    // Trigger Nimo reaction + audio & animations
    if (isCorrect) {
      playCorrect();
      showStarReward();

      if (shouldShowNimo) {
        setTimeout(() => {
          showHappyMessage("හරි! හොඳට කරලා තියෙනවා!", "Correct! Great job!", 2400, true);
          playHappy();
        }, 600);
      }

      // 8. Image Scale Up
      Animated.sequence([
        Animated.timing(imageScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(imageScale, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();

    } else {
      playWrong();

      if (shouldShowNimo) {
        setTimeout(() => {
          showSadMessage("අයියෝ! නැවත උත්සාහ කරමු!", "Oops! Try again!", 2400, true);
          playSad();
        }, 600);
      }

      // 9. Button Shake
      Animated.sequence([
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    const advanceQuiz = () => {
      setScore(updatedScore);
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
            pathname: "/modules/bilingual_translation/games/WordHuntResultScreen" as any,
            params: {
              score: updatedScore,
              totalQuestions: totalQuestions,
              correctCount: updatedScore,
              wrongCount: updatedWrongCount,
              accuracy: accuracy,
              difficultyStats: JSON.stringify(statsToSend),
              replayPath: "/modules/bilingual_translation/games/picturequiz",
            },
          });
        }, 3000);
        return;
      }

      setQuestionCount(updatedQuestion);
      setCurrentIndex((prev) => prev + 1);
    };

    // Transition after 3s to allow Nimo's voice to finish playing
    setTimeout(() => {
      setSelectedOption(null);
      setIsOptionCorrect(null);
      setIsAnswerLocked(false);
      advanceQuiz();
    }, 3000);
  };


  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading words...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => { playButtonClick(); void loadWords(); }} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 24, textAlign: "center" }}>No image quiz words available for the selected category.</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.scrollContainer}>
      <FloatingBubbles />
      <BackgroundSparkles />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} style={{ zIndex: 1 }}>
        {/* 2. Gradient Header */}
        <LinearGradient
          colors={['#63B3ED', '#4FD1C5']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Picture Quiz</Text>
          <Text style={styles.headerSubtitle}>Look at the image and choose the correct {langMode === 'S2T' ? 'Sinhala' : 'Tamil'} word</Text>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* 3. Score Card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>Score: {score} ⭐</Text>
            <Text style={styles.progressText}>
              Question: {currentIndex + 1} / {totalQuestions}
            </Text>
          </View>

          {/* 4. Image Display */}
          <View style={styles.imageCard}>
            <Animated.Image
              source={getImageSource(currentQuestion.image_url)}
              style={[
                styles.quizImage,
                { transform: [{ scale: imageScale }] }
              ]}
              resizeMode="cover"
            />
          </View>

          {/* 5. Question Text Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>What is this in {langMode === 'S2T' ? 'Sinhala' : 'Tamil'}?</Text>
          </View>

          {/* 6. Answer Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <AnswerButton
                key={index}
                option={option}
                isSelected={selectedOption === option}
                isCorrect={isOptionCorrect}
                wrongShakeAnim={wrongShakeAnim}
                disabled={isAnswerLocked}
                onPress={() => {
                  playButtonClick();
                  void checkAnswer(option);
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} muteSound={muteSound} />
      <StarRewardProvider />
      <FloatingNimo isIntroVisible={visible} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#EBF8FF', // Soft background
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  headerGradient: {
    height: 140,
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
    color: '#E6FFFA',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // Increased margin
    width: '100%',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  imageCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  quizImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
  },
  questionCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
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
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
