import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  BackHandler,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getWords, API_URL, saveGameLog } from '../../../../services/api';
import { COLORS } from '../../../../constants/colors';
import useNimo from '../hooks/useNimo';
import NimoAssistant from '../components/NimoAssistant';
import { playQuestion, playHappy, playSad, playCelebration, playMotivation } from '../services/nimoAudioService';
import { playCorrect, playWrong, playGameComplete, playButtonClick } from '../services/soundService';
import { playGameMusic, stopMusic } from '../services/musicService';
import { StarRewardProvider, showStarReward } from '../components/StarReward';
import { getLanguageMode, LanguageMode } from '../services/languageModeService';

const { width, height } = Dimensions.get("window");

interface Word {
  tamil_word: string;
  english_meaning: string;
  sinhala_meaning: string;
  category: string;
  difficulty: string;
}

interface MatchingPair {
  id: string;
  tamil: string;
  englishSinhala: string;
  matched: boolean;
  wordData?: Word;
}

interface ShuffledPair {
  id: string;
  englishSinhala: string;
  originalId: string;
}

const MATCHING_PAIRS_COUNT = 6;

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

// 10. Sparkle Effects
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


// 4 & 5. Animated Matching Card
const AnimatedCard = ({ 
  item, 
  type, 
  isSelected, 
  isMatched, 
  onPress,
  wrongShakeAnim,
  wrongPairId
}: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const matchScaleAnim = useRef(new Animated.Value(1)).current;

  // React to matched state for animation
  useEffect(() => {
    if (isMatched) {
      Animated.sequence([
        Animated.timing(matchScaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(matchScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        })
      ]).start();
    }
  }, [isMatched]);

  const handlePressIn = () => {
    if (isMatched) return;
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 120, // Animation duration 120ms
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
  };

  const handlePressOut = () => {
    if (isMatched) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const isTamil = type === 'tamil';
  
  // Base styling for unselected cards
  const baseBg = isTamil ? '#E6FFFA' : '#FFFFF0';
  const baseBorder = isTamil ? '#38B2AC' : '#ECC94B';
  const textStyle = isTamil ? styles.cardText : styles.cardSmallText;
  
  // Dynamic Background
  let bgColor = baseBg;
  let borderColor = baseBorder;
  let bWidth = 2; // borderWidth: 2

  if (isMatched) {
    bgColor = '#C8E6C9'; // Light green for correct pair
    borderColor = '#4CAF50';
  } else if (isSelected) {
    bgColor = isTamil ? '#B2F5EA' : '#FEFCBF';
    bWidth = 3;
    borderColor = isTamil ? '#319795' : '#D69E2E';
  }

  const isWrong = wrongPairId && wrongPairId.includes(item.id);
  if (isWrong) {
    borderColor = '#E53E3E'; // Red border flash
    bWidth = 3;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isMatched}
      style={{ marginBottom: 15 }}
    >
      <Animated.View style={{
          transform: [
            { scale: isMatched ? matchScaleAnim : scale }, 
            { translateX: isWrong ? wrongShakeAnim : 0 }
          ],
          backgroundColor: bgColor,
          borderRadius: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 5,
          elevation: 4,
          minHeight: 80,
          width: '100%'
      }}>
        <View style={{
          flex: 1,
          borderRadius: 20,
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: bWidth,
          borderColor: borderColor,
          overflow: 'hidden', // Important for glossy effect
        }}>
          {/* Glass Glare Stripes */}
          <View style={{
            position: 'absolute',
            top: '-50%',
            left: '10%',
            width: '25%',
            height: '200%',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            transform: [{ rotate: '35deg' }],
          }} />
          <View style={{
            position: 'absolute',
            top: '-50%',
            left: '40%',
            width: '10%',
            height: '200%',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            transform: [{ rotate: '35deg' }],
          }} />

          <Text style={[textStyle, isMatched && styles.matchedCardText, isSelected && { fontWeight: '700' }, { zIndex: 1 }]}>
            {isTamil ? item.tamil : item.englishSinhala}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};


const MatchingGameScreen: React.FC = () => {
  const router = useRouter();
  const { emotion, subtitle, visible, muteSound, showHappyMessage, showSadMessage } = useNimo();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [shuffledPairs, setShuffledPairs] = useState<ShuffledPair[]>([]);
  const [selectedTamil, setSelectedTamil] = useState<string | null>(null);
  const [selectedEnglishSinhala, setSelectedEnglishSinhala] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [playerName] = useState<string>('Player');
  const [wordMap, setWordMap] = useState<{ [key: string]: Word }>({});
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');
  
  // 7. Wrong Match Animation state
  const wrongShakeAnim = useRef(new Animated.Value(0)).current;
  const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);

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
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const onBackPress = () => {
        router.replace('/modules/bilingual_translation/games' as any);
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  useEffect(() => {
    loadWords();
  }, []);

  // Nimo welcome message + audio when game starts
  useEffect(() => {
    if (!loading && pairs.length > 0) {
      showHappyMessage(
        "ගැලපෙන යුගල සොයන්න!",
        "Find the matching pairs!"
      );
      playQuestion();
    }
  }, [loading, pairs.length]);

  useEffect(() => {
    if (matchedPairs.length === pairs.length && pairs.length > 0) {
      setGameComplete(true);
    }
  }, [matchedPairs, pairs]);

  useEffect(() => {
    if (gameComplete) {
      handleGameComplete();
    }
  }, [gameComplete]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadWords = async () => {
    try {
      setLoading(true);
      setError(null);
      setGameStartTime(Date.now());

      const data = await getWords();

      if (!Array.isArray(data) || data.length === 0) {
        setError('No words available. Please try again.');
        return;
      }

      // Select 6 random words
      const shuffled = shuffleArray(data);
      const selectedWords = shuffled.slice(0, MATCHING_PAIRS_COUNT) as Word[];

      // Create word map for easy access
      const newWordMap: { [key: string]: Word } = {};
      selectedWords.forEach((word, index) => {
        newWordMap[`tamil_${index}`] = word;
      });
      setWordMap(newWordMap);

      // Create matching pairs
      const newPairs: MatchingPair[] = selectedWords.map((word, index) => ({
        id: `tamil_${index}`,
        tamil: langMode === 'S2T' ? word.sinhala_meaning : word.tamil_word,
        englishSinhala: langMode === 'S2T' ? `${word.english_meaning} - ${word.tamil_word}` : `${word.english_meaning} - ${word.sinhala_meaning}`,
        matched: false,
        wordData: word,
      }));

      // Create shuffled right column
      const rightColumnData: ShuffledPair[] = selectedWords.map((word, index) => ({
        id: `english_${index}`,
        englishSinhala: langMode === 'S2T' ? `${word.english_meaning} - ${word.tamil_word}` : `${word.english_meaning} - ${word.sinhala_meaning}`,
        originalId: `tamil_${index}`,
      }));

      const shuffledRight = shuffleArray(rightColumnData);

      setPairs(newPairs);
      setShuffledPairs(shuffledRight);
    } catch (err) {
      console.error('Error loading words:', err);
      setError('Failed to load words. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleTamilPress = (pairId: string) => {
    if (matchedPairs.includes(pairId)) return;

    if (selectedTamil === pairId) {
      setSelectedTamil(null);
    } else {
      setSelectedTamil(pairId);

      // If both are selected, check the match
      if (selectedEnglishSinhala) {
        checkMatch(pairId, selectedEnglishSinhala);
      }
    }
  };

  const handleEnglishSinhalaPressPress = (shuffledId: string, originalId: string) => {
    if (matchedPairs.includes(originalId)) return;

    if (selectedEnglishSinhala === shuffledId) {
      setSelectedEnglishSinhala(null);
    } else {
      setSelectedEnglishSinhala(shuffledId);

      // If both are selected, check the match
      if (selectedTamil) {
        checkMatch(selectedTamil, shuffledId);
      }
    }
  };

  const checkMatch = (tamilId: string, englishSindhalaId: string) => {
    // Find the original ID of the selected English/Sinhala
    const selected = shuffledPairs.find((p) => p.id === englishSindhalaId);

    if (!selected) return;

    clearSelections();

    const isFinalPair = matchedPairs.length === pairs.length - 1;
    const shouldShowNimo = !isFinalPair && (Math.random() < 1/3);

    if (tamilId === selected.originalId) {
      // 6. Correct match
      const newScore = score + 10;
      setScore(newScore); // Update score immediately so badge popup can trigger
      setMatchedPairs([...matchedPairs, tamilId]);
      playCorrect();
      showStarReward(); // Star burst animation

      if (shouldShowNimo) {
        setTimeout(() => {
          showHappyMessage("හරි! හොඳට කරලා තියෙනවා!", "Correct! Great job!", 2400, true);
          playHappy();
        }, 600);
      }

      // Send game log for correct match
      sendGameLog(tamilId, true);
    } else {
      // 7. Wrong match animation
      setWrongAttempts(wrongAttempts + 1);
      setWrongPairIds([tamilId, englishSindhalaId]);
      
      playWrong();

      if (shouldShowNimo) {
        setTimeout(() => {
          showSadMessage("අයියෝ! නැවත උත්සාහ කරමු!", "Oops! Try again!", 2400, true);
          playSad();
        }, 600);
      }

      Animated.sequence([
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setWrongPairIds([]));

      // Send game log for wrong match
      sendGameLog(tamilId, false, selected.originalId);
    }
  };

  const sendGameLog = async (tamilId: string, isCorrect: boolean, wrongTamilId?: string) => {
    const wordData = wordMap[tamilId];
    
    if (!wordData) return;

    // Get the selected answer
    const wrongWordData = wrongTamilId ? wordMap[wrongTamilId] : null;
    const selectedAnswer = wordData.english_meaning;
    const correctAnswer = wrongTamilId 
      ? wrongWordData?.english_meaning 
      : wordData.english_meaning;
    const timeTaken = Math.max(1, Math.round((Date.now() - gameStartTime) / 1000));

    // Create game log object
    const gameLog = {
      player_name: playerName,
      tamil_word: wordData.tamil_word,
      english_meaning: wordData.english_meaning,
      sinhala_meaning: wordData.sinhala_meaning,
      selected_answer: selectedAnswer,
      correct_answer: correctAnswer || wordData.english_meaning,
      difficulty: wordData.difficulty 
        ? wordData.difficulty.charAt(0).toUpperCase() + wordData.difficulty.slice(1).toLowerCase()
        : 'Medium',
      category: wordData.category || 'general',
      is_correct: isCorrect,
      game_type: 'Matching Game',
      time_taken: timeTaken,
      created_at: new Date(),
    };

    await saveGameLog(gameLog);
  };

  const clearSelections = () => {
    setSelectedTamil(null);
    setSelectedEnglishSinhala(null);
  };

  const handleGameComplete = () => {
    const accuracy = pairs.length > 0 
      ? (matchedPairs.length / pairs.length) * 100 
      : 0;

    // Play end-of-game audio based on performance
    if (accuracy >= 70) {
      showHappyMessage("නියමයි! අති විශිෂ්ටයි!", "Amazing! Great job!", 3000, false);
      playCelebration();
    } else {
      showHappyMessage("උත්සාහය හොඳයි! තව දුරටත් පුහුණු වෙමු!", "Good try!", 3000, false);
      playMotivation();
    }

    setTimeout(() => {
      playGameComplete();
      router.push({
        pathname: '/modules/bilingual_translation/games/MatchingGameResultScreen' as any,
        params: {
          score: score,
          totalPairs: pairs.length,
          correctMatches: matchedPairs.length,
          wrongMatches: wrongAttempts,
          accuracy: accuracy,
        },
      });
    }, 3000);
  };

  if (loading) {
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
        <Pressable style={styles.retryButton} onPress={() => { playButtonClick(); loadWords(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.scrollContainer}>
      <FloatingBubbles />
      <BackgroundSparkles />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} style={{ zIndex: 1 }}>
        {/* 2. Gradient Header */}
        <LinearGradient
          colors={['#4FD1C5', '#63B3ED']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Matching Game</Text>
          <Text style={styles.headerSubtitle}>Match Tamil words with meanings</Text>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* 3. Score Card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>Score: {score} ⭐</Text>
            <Text style={styles.progressText}>
              Matched: {matchedPairs.length} / {pairs.length}
            </Text>
          </View>

          {/* Game Board */}
          <View style={styles.gameBoard}>
            {/* Left Column - Primary Words */}
            <View style={styles.column}>
              <Text style={styles.columnTitle}>{langMode === 'S2T' ? 'Sinhala' : 'Tamil'}</Text>
              {pairs.map((pair) => (
                <AnimatedCard
                  key={pair.id}
                  item={pair}
                  type="tamil"
                  isSelected={selectedTamil === pair.id}
                  isMatched={matchedPairs.includes(pair.id)}
                  wrongShakeAnim={wrongShakeAnim}
                  wrongPairId={wrongPairIds}
                  onPress={() => {
                    playButtonClick();
                    handleTamilPress(pair.id);
                  }}
                />
              ))}
            </View>

            {/* Right Column - English & Sinhala Meanings */}
            <View style={styles.column}>
              <Text style={styles.columnTitle}>Meaning</Text>
              {shuffledPairs.map((pair) => (
                <AnimatedCard
                  key={pair.id}
                  item={pair}
                  type="meaning"
                  isSelected={selectedEnglishSinhala === pair.id}
                  isMatched={matchedPairs.includes(pair.originalId)}
                  wrongShakeAnim={wrongShakeAnim}
                  wrongPairId={wrongPairIds}
                  onPress={() => {
                    playButtonClick();
                    handleEnglishSinhalaPressPress(pair.id, pair.originalId);
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} muteSound={muteSound} />
      <StarRewardProvider />
      <FloatingNimo isIntroVisible={visible} />
    </View>
  );
};

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
    fontSize: 16,
    color: '#E6FFFA',
    fontWeight: '600',
    marginTop: 6,
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
    marginBottom: 24,
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
  gameBoard: {
    flexDirection: 'row',
    gap: 16, // spacing between columns
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardButton: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C7A7B', // Teal text for Tamil
    textAlign: 'center',
  },
  cardSmallText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B7791F', // Yellow text for Meaning
    textAlign: 'center',
  },
  matchedCardText: {
    color: '#2E7D32',
    fontWeight: '800',
  },
});

export default MatchingGameScreen;
