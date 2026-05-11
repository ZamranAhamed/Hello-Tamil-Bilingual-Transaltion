import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, BackHandler, Platform, Dimensions, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, Easing } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import AnimatedBackground from '../components/AnimatedBackground';
import { getWords, getWordByTamil, API_URL, saveGameLog } from '../../../../services/api';
import { generateQuizOptions, WordEntry, QuizQuestion } from '../utils/generateQuizOptions';
import { performOCR, extractFirstTamilWord, extractAllTamilWords } from '../ocr/ocrService';
import { COLORS } from '../../../../constants/colors';
import { getLanguageMode, LanguageMode } from '../services/languageModeService';
import { BadgePopup } from '../components/ProgressBadge';
import NimoAssistant from '../components/NimoAssistant';
import useNimo from '../hooks/useNimo';
import { playQuestion, playHappy, playSad } from '../services/nimoAudioService';
import { playCorrect, playWrong } from '../services/soundService';

const extractTranslatedText = (payload: any): string => {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return '';
  }

  return payload[0]
    .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
    .filter((part: any) => typeof part === 'string' && part.trim().length > 0)
    .join('')
    .trim();
};

const translateTamilWord = async (word: string, targetLang: 'en' | 'si'): Promise<string> => {
  try {
    const endpoint =
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return '';
    }
    const payload = await response.json();
    return extractTranslatedText(payload);
  } catch (error) {
    console.warn('Fallback translation failed:', error);
    return '';
  }
};

const normalizeTamilWord = (value: string): string => {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[^\u0B80-\u0BFF\u000C\u000D]+/g, '')
    .trim();
};

const AnswerOption = ({ optionText, isCorrect, isSelected, showResult, onSelect }: any) => {
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  const randomColor = React.useMemo(() => {
    const pastelColors = [
      "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
      "#E0BBE4", "#957DAD", "#D291BC", "#FEC8D8", "#FFDFD3",
      "#A0E6FF", "#FFF6A3", "#FFC6FF", "#BDB2FF", "#CAFFBF",
      "#FDE2E4", "#FAD2E1", "#C5DEDD", "#DBE7E4", "#F0EFEB"
    ];
    return pastelColors[Math.floor(Math.random() * pastelColors.length)];
  }, [optionText]);

  const handlePressIn = () => {
    if (showResult) return;
    scale.value = withTiming(0.95, { duration: 120, easing: Easing.out(Easing.ease) });
  };

  const handlePressOut = () => {
    if (showResult) return;
    scale.value = withSpring(1, { damping: 5, stiffness: 40 });
  };

  useEffect(() => {
    if (showResult && isSelected && !isCorrect) {
       shakeX.value = withSequence(
         withTiming(10, { duration: 50 }),
         withTiming(-10, { duration: 50 }),
         withTiming(10, { duration: 50 }),
         withTiming(-10, { duration: 50 }),
         withTiming(0, { duration: 50 })
       );
    }
  }, [showResult, isSelected, isCorrect]);

  let bgColor = randomColor;
  let borderColor = "rgba(255,255,255,0.6)";
  let borderWidth = 2;
  let textColor = "#333333";

  if (showResult) {
    if (isCorrect) {
      bgColor = "#38A169"; 
      borderColor = "#276749";
      textColor = "white";
    } else if (isSelected) {
      bgColor = "#F56565"; 
      borderColor = "#C53030"; 
      textColor = "white";
    } else {
      bgColor = "#A0AEC0"; // Gray out
      textColor = "#333333";
    }
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onSelect}
      disabled={showResult}
      style={{ width: "45%", margin: "2%", aspectRatio: 1 }}
    >
      <Animated.View style={[animatedStyle, { 
        width: '100%', 
        height: '100%',
        backgroundColor: bgColor,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
      }]}>
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
            {optionText}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default function ScanLearn({ playerName = 'Player' }: { playerName?: string }) {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);

  // Tesseract WebView Refs
  const webViewRef = useRef<WebView>(null);
  const resolveOcrRef = useRef<((text: string) => void) | null>(null);
  const rejectOcrRef = useRef<((err: Error) => void) | null>(null);
  const [isTesseractReady, setIsTesseractReady] = useState(false);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        console.log("[ScanLearn] Tesseract Engine is ready!");
        setIsTesseractReady(true);
      } else if (data.type === 'success') {
        if (resolveOcrRef.current) resolveOcrRef.current(data.text);
      } else if (data.type === 'error') {
        if (rejectOcrRef.current) rejectOcrRef.current(new Error(data.error));
      }
    } catch (e) {
      console.error("WebView Message Error:", e);
    }
  };
  const [detectedText, setDetectedText] = useState<string>('');        // raw OCR output
  const [detectedWordEntry, setDetectedWordEntry] = useState<WordEntry | null>(null); // resolved word
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [imageProcessing, setImageProcessing] = useState<boolean>(false);
  const [wordsDataset, setWordsDataset] = useState<WordEntry[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [manualWord, setManualWord] = useState<string>('');
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);

  const { emotion, subtitle, visible, showHappyMessage, showSadMessage } = useNimo();
  const { playQuestion, playHappy, playSad } = { 
    playQuestion: require('../services/nimoAudioService').playQuestion, 
    playHappy: require('../services/nimoAudioService').playHappy, 
    playSad: require('../services/nimoAudioService').playSad 
  };

  const confettiRef = useRef<ConfettiCannon>(null);
  const buttonScale = useSharedValue(1);
  const scanLineY = useSharedValue(0);
  const mascotY = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const scanLineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (imageProcessing) {
      scanLineY.value = 0;
      scanLineY.value = withRepeat(
        withTiming(250, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      scanLineY.value = 0;
    }
  }, [imageProcessing]);

  useFocusEffect(
    useCallback(() => {
      setLangMode(getLanguageMode());
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
    loadWordsDataset();
  }, []);

  const loadWordsDataset = async () => {
    try {
      setLoading(true);

      const data = await getWords();
      const mappedWords: WordEntry[] = data.map((word: any) => ({
        tamil: word.tamil_word || word.tamil,
        english: word.english_meaning || word.english,
        sinhala: word.sinhala_meaning || word.sinhala,
        difficulty: (word.difficulty || 'medium').toLowerCase(),
        category: word.category || 'general',
      }));
      setWordsDataset(mappedWords);
      setError(null);
    } catch (err) {
      console.error('Error loading words:', err);
      setError('Failed to load words dataset');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to use this feature');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      processImage(result.assets[0].uri);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Gallery permission is required to use this feature');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      processImage(result.assets[0].uri);
    }
  };

  // Helper: fuzzy match – find the best match from database for an OCR word
  const findBestMatch = (ocrWord: string): WordEntry | null => {
    const normalized = normalizeTamilWord(ocrWord);
    if (!normalized) return null;

    // 1. Exact match
    const exact = wordsDataset.find(
      (w) => normalizeTamilWord(w.tamil) === normalized
    );
    if (exact) return exact;

    // 2. Substring match – OCR word contains a DB word, or vice-versa
    const substringMatch = wordsDataset.find((w) => {
      const dbNorm = normalizeTamilWord(w.tamil);
      return dbNorm.length >= 2 && (normalized.includes(dbNorm) || dbNorm.includes(normalized));
    });
    if (substringMatch) return substringMatch;

    const fuzzyMatch = wordsDataset.find((w) => {
      const dbNorm = normalizeTamilWord(w.tamil);
      return (
        dbNorm.startsWith(normalized) ||
        dbNorm.endsWith(normalized) ||
        normalized.startsWith(dbNorm) ||
        normalized.endsWith(dbNorm)
      );
    });
    if (fuzzyMatch) return fuzzyMatch;

    return null;
  };

  const processImage = async (imageUri: string) => {
    setImage(imageUri);
    setImageProcessing(true);
    setQuestionStartTime(Date.now());
    setError(null);
    setQuiz(null);
    setDetectedWordEntry(null);
    setDetectedText('');

    // Capture current langMode from state (may be stale in closure, read fresh)
    const currentLangMode: LanguageMode = getLanguageMode();

    try {
      let ocrMatched = false;
      try {
        if (!isTesseractReady) {
            throw new Error("OCR Engine is still downloading languages. Please wait a few seconds and try again.");
        }

        // 1. Convert to base64
        const optimized = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }], // Resize for faster processing
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const base64Image = `data:image/jpeg;base64,${optimized.base64}`;

        // 2. Run Tesseract.js inside the WebView
        const ocrText = await new Promise<string>((resolve, reject) => {
          resolveOcrRef.current = resolve;
          rejectOcrRef.current = reject;
          
          webViewRef.current?.injectJavaScript(`
            try {
              Tesseract.recognize(
                '${base64Image}',
                'tam'
              ).then(({ data: { text } }) => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', text: text }));
              }).catch(err => {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: err.message }));
              });
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: e.message }));
            }
            true;
          `);
        });

        console.log('[ScanLearn] OCR raw text:', ocrText);
        setDetectedText(ocrText);

        const allTamilWords = extractAllTamilWords(ocrText);
        console.log('[ScanLearn] Tamil words extracted:', allTamilWords);

        // ── Step 2: Try to match each detected Tamil word against dataset ──
        for (const candidate of allTamilWords) {
          const localMatch = findBestMatch(candidate);
          if (localMatch) {
            console.log('[ScanLearn] Matched dataset word:', localMatch.tamil);
            setDetectedWordEntry(localMatch);

            const combinedDataset: WordEntry[] = [
              localMatch,
              ...wordsDataset.filter((w) => normalizeTamilWord(w.tamil) !== normalizeTamilWord(localMatch.tamil)),
            ];
            // Use actual langMode so quiz respects T2S / S2T
            const primaryWord = currentLangMode === 'S2T' ? localMatch.sinhala : localMatch.tamil;
            const quizData = generateQuizOptions(primaryWord, combinedDataset, currentLangMode);
            if (quizData) {
              setQuiz(quizData);
              setSelectedAnswer('');
              setShowResult(false);
              playQuestion();
              showHappyMessage('මේ වචනය බලන්න!', 'Look at this word!');
              ocrMatched = true;
              break;
            }
          }
        }

        // ── Step 3: Word not in dataset — fetch translation as fallback ────
        if (!ocrMatched && allTamilWords.length > 0) {
          const targetWord = allTamilWords[0];
          console.log('[ScanLearn] Word not in DB, fetching translation:', targetWord);

          let apiWord: any = null;
          try { apiWord = await getWordByTamil(targetWord); } catch {}

          const matchedTamilWord = apiWord
            ? (apiWord.tamil_word || apiWord.tamil || targetWord)
            : targetWord;

          let normalizedWord: WordEntry;
          if (apiWord) {
            normalizedWord = {
              tamil: matchedTamilWord,
              english: apiWord.english_meaning || apiWord.english || '',
              sinhala: apiWord.sinhala_meaning || apiWord.sinhala || '',
              difficulty: (apiWord.difficulty || 'medium').toLowerCase(),
              category: apiWord.category || 'general',
            };
          } else {
            const [englishFallback, sinhalaFallback] = await Promise.all([
              translateTamilWord(matchedTamilWord, 'en'),
              translateTamilWord(matchedTamilWord, 'si'),
            ]);
            normalizedWord = {
              tamil: matchedTamilWord,
              english: englishFallback || matchedTamilWord,
              sinhala: sinhalaFallback || matchedTamilWord,
              difficulty: 'medium',
              category: 'general',
            };
          }

          setDetectedWordEntry(normalizedWord);

          const combinedDataset: WordEntry[] = [
            normalizedWord,
            ...wordsDataset.filter((w) => normalizeTamilWord(w.tamil) !== normalizeTamilWord(normalizedWord.tamil)),
          ];
          const primaryWord = currentLangMode === 'S2T' ? normalizedWord.sinhala : normalizedWord.tamil;
          const quizData = generateQuizOptions(primaryWord, combinedDataset, currentLangMode);
          if (quizData) {
            setQuiz(quizData);
            setSelectedAnswer('');
            setShowResult(false);
            playQuestion();
            showHappyMessage('මේ වචනය බලන්න!', 'Look at this word!');
            ocrMatched = true;
          }
        }
      } catch (ocrErr: any) {
        console.warn('[ScanLearn] OCR pipeline failed:', ocrErr?.message);
      }

      // ── Step 4: No OCR match at all — show word picker fallback ──────────
      if (!ocrMatched) {
        setError('Could not detect a Tamil word. Select the word you photographed from the list below:');
      }
    } catch (err: any) {
      console.error('[ScanLearn] processImage error:', err);
      setError('Could not detect a Tamil word. Select the word you photographed from the list below:');
    } finally {
      setImageProcessing(false);
    }
  };

  const sendGameLog = async (
    tamilWord: string,
    englishMeaning: string,
    sinhalaMeaning: string,
    selectedAnswer: string,
    correctAnswer: string,
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
      selected_answer: selectedAnswer,
      correct_answer: correctAnswer,
      difficulty,
      category,
      is_correct: isCorrect,
      game_type: 'Scan & Learn',
      time_taken: timeTaken,
      created_at: new Date(),
    };

    await saveGameLog(gameLog);
  };

  const handleAnswerSelect = (answer: string) => {
    if (quiz) {
      const selectedEnglish = answer.split(' - ')[0];
      const correctEnglish = quiz.correctAnswer.split(' - ')[0];
      const isCorrect = selectedEnglish === correctEnglish;

      if (isCorrect) {
        confettiRef.current?.start();
        showHappyMessage("හරි! හොඳට කරලා තියෙනවා!", "Correct! Great job!");
        playHappy();
        playCorrect();
        setSessionCorrectCount(prev => prev + 1);
      } else {
        showSadMessage("අයියෝ! නැවත උත්සාහ කරමු!", "Oops! Try again!");
        playSad();
        playWrong();
      }

      sendGameLog(
        quiz.tamilWord,
        quiz.englishMeaning,
        quiz.sinhalaMeaning,
        selectedEnglish,
        correctEnglish,
        quiz.difficulty,
        quiz.category,
        isCorrect
      );
    }
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const resetQuiz = () => {
    setImage(null);
    setDetectedText('');
    setDetectedWordEntry(null);
    setQuiz(null);
    setSelectedAnswer('');
    setShowResult(false);
    setError(null);
    setManualWord('');
  };

  // Manual word entry: user types a Tamil word and generates the quiz from it
  const handleManualWordSubmit = async () => {
    const word = manualWord.trim();
    if (!word) return;

    setError(null);
    setDetectedText(word);

    try {
      // Same logic as processImage but using the typed word
      const allTamilWords = extractAllTamilWords(word);
      const targetWord = allTamilWords.length > 0 ? allTamilWords[0] : word;

      let matchedEntry = findBestMatch(targetWord);
      let matchedTamilWord = matchedEntry?.tamil || targetWord;

      let apiWord: any = null;
      if (!matchedEntry) {
        try {
          apiWord = await getWordByTamil(targetWord);
          if (apiWord) {
            matchedTamilWord = apiWord.tamil_word || apiWord.tamil || targetWord;
          }
        } catch {}
      }

      let normalizedWord: WordEntry;
      if (matchedEntry) {
        normalizedWord = matchedEntry;
      } else if (apiWord) {
        normalizedWord = {
          tamil: apiWord.tamil_word || apiWord.tamil || matchedTamilWord,
          english: apiWord.english_meaning || apiWord.english || '',
          sinhala: apiWord.sinhala_meaning || apiWord.sinhala || '',
          difficulty: (apiWord.difficulty || 'medium').toLowerCase(),
          category: apiWord.category || 'general',
        };
      } else {
        const [englishFallback, sinhalaFallback] = await Promise.all([
          translateTamilWord(matchedTamilWord, 'en'),
          translateTamilWord(matchedTamilWord, 'si'),
        ]);
        normalizedWord = {
          tamil: matchedTamilWord,
          english: englishFallback || matchedTamilWord,
          sinhala: sinhalaFallback || matchedTamilWord,
          difficulty: 'medium',
          category: 'general',
        };
      }

      const combinedDataset: WordEntry[] = [
        normalizedWord,
        ...wordsDataset.filter((w) => normalizeTamilWord(w.tamil) !== normalizeTamilWord(normalizedWord.tamil)),
      ];

      const quizMode: LanguageMode = 'T2S';
      const quizData = generateQuizOptions(normalizedWord.tamil, combinedDataset, quizMode);
      if (!quizData) {
        setError('Word not found. Try a different Tamil word.');
        return;
      }

      setQuiz(quizData);
      setSelectedAnswer('');
      setShowResult(false);
      setManualWord('');
      playQuestion();
      showHappyMessage("මේ වචනය බලන්න!", "Look at this word!");
    } catch (err: any) {
      setError('Failed to process the word. ' + (err?.message || ''));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingScreenText}>Loading words dataset...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground />
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <LinearGradient colors={['#9F7AEA', '#ED64A6']} style={styles.linearHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/modules/bilingual_translation/games' as any)}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>📷 Scan & Learn</Text>
          <Text style={styles.subtitle}>Scan a Tamil word and learn its meaning</Text>
        </LinearGradient>

        {!image ? (
          <View style={styles.section}>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionText}>Take a picture of a Tamil word to discover its meaning!</Text>
            </View>
            <View style={[styles.buttonContainer, { alignItems: 'center' }]}>
              <Animated.View style={buttonAnimatedStyle}>
                <TouchableOpacity style={styles.cameraButton} onPress={() => {
                   buttonScale.value = withSequence(withTiming(0.9, { duration: 100 }), withSpring(1));
                   pickImage();
                }}>
                  <Text style={styles.cameraButtonIcon}>📷</Text>
                </TouchableOpacity>
              </Animated.View>
                <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                  <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.galleryButton, { backgroundColor: COLORS.yellow, marginTop: 16, width: '100%', alignItems: 'center' }]} 
                  onPress={() => router.replace('/modules/bilingual_translation/games' as any)}
                >
                  <Text style={[styles.galleryButtonText, { color: COLORS.navy }]}>Back to Games</Text>
                </TouchableOpacity>
              </View>
          </View>
        ) : null}

        {imageProcessing ? (
          <View style={styles.section}>
            {image && (
               <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, marginBottom: 16 }}>
                  <Image source={{ uri: image }} style={[styles.image, { marginBottom: 0 }]} />
                  <Animated.View style={[styles.scanLine, scanLineAnimatedStyle]} />
               </View>
            )}
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#48BB78" />
              <Text style={styles.loadingText}>Processing image with OCR...</Text>
            </View>
          </View>
        ) : null}

        {image && !imageProcessing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Captured Image:</Text>
            <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, marginBottom: 16 }}>
               <Image source={{ uri: image }} style={[styles.image, { marginBottom: 0 }]} />
            </View>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: '#EBF8FF', borderLeftColor: '#4299E1' }]}>
                <Text style={[styles.errorText, { color: '#2B6CB0' }]}>📸 {String(error || 'Unknown error')}</Text>
                
                {/* Word Picker from DB */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy, marginBottom: 8 }}>
                    📝 Pick the word you photographed:</Text>
                  <TextInput
                    style={{
                      borderWidth: 2,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 16,
                      backgroundColor: 'white',
                      color: COLORS.navy,
                      marginBottom: 8,
                    }}
                    placeholder="Search words..."
                    placeholderTextColor="#CBD5E0"
                    value={manualWord}
                    onChangeText={setManualWord}
                    autoCorrect={false}
                  />
                  <ScrollView 
                    style={{ maxHeight: 200, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}
                    nestedScrollEnabled={true}
                  >
                    {wordsDataset
                      .filter((w) => {
                        if (!manualWord.trim()) return true;
                        const search = manualWord.trim().toLowerCase();
                        return (
                          w.tamil.includes(search) ||
                          w.english.toLowerCase().includes(search) ||
                          w.sinhala.includes(search)
                        );
                      })
                      .slice(0, 20)
                      .map((w, idx) => (
                        <TouchableOpacity
                          key={`word-${idx}`}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#F7FAFC',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            setManualWord(w.tamil);
                            // Directly generate quiz with this word
                            setError(null);
                            setDetectedText(w.tamil);
                            const combinedDataset: WordEntry[] = [
                              w,
                              ...wordsDataset.filter((wd) => normalizeTamilWord(wd.tamil) !== normalizeTamilWord(w.tamil)),
                            ];
                            const quizData = generateQuizOptions(langMode === 'S2T' ? w.sinhala : w.tamil, combinedDataset, langMode);
                            if (quizData) {
                              setQuiz(quizData);
                              setSelectedAnswer('');
                              setShowResult(false);
                              setManualWord('');
                              playQuestion();
                              showHappyMessage("මේ වචනය බලන්න!", "Look at this word!");
                            }
                          }}
                        >
                          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.navy }}>{w.tamil}</Text>
                          <Text style={{ fontSize: 14, color: COLORS.text }}>{w.english} - {w.sinhala}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>

                  {/* Manual entry button as backup */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.teal,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      marginTop: 12,
                    }}
                    onPress={handleManualWordSubmit}
                    disabled={!manualWord.trim()}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Generate Quiz</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {detectedWordEntry ? (
              <View style={[
                styles.detectedSection,
                { backgroundColor: '#F0FFF4', borderLeftWidth: 4, borderLeftColor: '#38A169', borderRadius: 12, padding: 16 }
              ]}>
                <Text style={[styles.sectionTitle, { color: '#276749', marginBottom: 6 }]}>
                  🔍 Detected Word:
                </Text>
                {/* Tamil word — large and prominent */}
                <Text style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#22543D',
                  textAlign: 'center',
                  letterSpacing: 2,
                  marginBottom: 8,
                }}>
                  {detectedWordEntry.tamil}
                </Text>
                {/* English meaning */}
                {detectedWordEntry.english ? (
                  <Text style={{ fontSize: 16, color: '#2D6A4F', textAlign: 'center', fontWeight: '600' }}>
                    🇬🇧 {detectedWordEntry.english}
                  </Text>
                ) : null}
                {/* Sinhala meaning */}
                {detectedWordEntry.sinhala ? (
                  <Text style={{ fontSize: 16, color: '#40916C', textAlign: 'center', marginTop: 4 }}>
                    🇱🇰 {detectedWordEntry.sinhala}
                  </Text>
                ) : null}
              </View>
            ) : detectedText ? (
              // Show raw OCR text only if we couldn't resolve a word entry
              <View style={styles.detectedSection}>
                <Text style={styles.sectionTitle}>Detected Text:</Text>
                <Text style={styles.detectedText}>{String(detectedText)}</Text>
              </View>
            ) : null}

            {quiz ? (
              <View style={styles.quizSection}>
                <Text style={[styles.difficultyLabel, { color: getDifficultyColor(String(quiz.difficulty || 'medium')) }]}>
                  Difficulty: {String(quiz.difficulty || 'Medium')}
                </Text>

                <View style={styles.metadataRow}>
                  <View style={[styles.badge, { backgroundColor: getDifficultyColor(String(quiz.difficulty || 'medium')) }]}>
                    <Text style={styles.badgeText}>{String(quiz.difficulty || 'unknown')}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: COLORS.navy }]}>
                    <Text style={styles.badgeText}>{String(quiz.category || 'general')}</Text>
                  </View>
                </View>

                <View style={styles.quizQuestionCard}>
                  {/* Show the scanned Tamil word prominently in the quiz */}
                  <Text style={{
                    fontSize: 34,
                    fontWeight: 'bold',
                    color: '#553C9A',
                    textAlign: 'center',
                    letterSpacing: 2,
                    marginBottom: 6,
                  }}>
                    {langMode === 'S2T' ? quiz.sinhalaMeaning : quiz.tamilWord}
                  </Text>
                  <Text style={styles.question}>
                    {langMode === 'S2T'
                      ? 'What is the Tamil word for this?'
                      : 'What does this Tamil word mean?'}
                  </Text>
                </View>

                <View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                    {quiz?.options && Array.isArray(quiz.options) && quiz.options.length > 0 ? (
                      quiz.options.map((option: any, index: number) => {
                        const optionText = String(option || 'Invalid option');
                        return (
                          <AnswerOption
                            key={`option-${index}`}
                            optionText={optionText}
                            isCorrect={optionText === quiz.correctAnswer}
                            isSelected={selectedAnswer === optionText}
                            showResult={showResult}
                            onSelect={() => {
                              if (!showResult && optionText) {
                                handleAnswerSelect(optionText);
                              }
                            }}
                          />
                        );
                      })
                    ) : (
                      <Text style={styles.optionText}>No options available</Text>
                    )}
                  </View>
                </View>

                {showResult ? (
                  <>
                    <View style={[styles.resultContainer, { backgroundColor: selectedAnswer === quiz.correctAnswer ? '#D4EDDA' : '#F8D7DA' }]}>
                      <View style={styles.resultHeader}>
                        <MaterialCommunityIcons
                          name={selectedAnswer === quiz.correctAnswer ? 'check-circle' : 'close-circle'}
                          size={22}
                          color={selectedAnswer === quiz.correctAnswer ? '#2E7D32' : '#C62828'}
                        />
                        <Text style={[styles.resultText, { color: selectedAnswer === quiz.correctAnswer ? '#155724' : '#721C24' }]}>
                          {selectedAnswer === quiz.correctAnswer ? 'Correct!' : 'Incorrect!'}
                        </Text>
                      </View>
                      <Text style={[styles.correctAnswer, { color: selectedAnswer === quiz.correctAnswer ? '#155724' : '#721C24' }]}>
                        Correct Answer: {String(quiz.correctAnswer || 'N/A')}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.goBackButton}
                      onPress={() => router.replace('/modules/bilingual_translation/games' as any)}
                    >
                      <Text style={styles.goBackButtonText}>Go back to Games</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}

            {image && (
              <TouchableOpacity style={styles.primaryButton} onPress={resetQuiz}>
                <Text style={styles.primaryButtonText}>Scan Another Image</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>

      <ConfettiCannon
        count={100}
        origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
        autoStart={false}
        ref={confettiRef}
        fadeOut={true}
        fallSpeed={3000}
        colors={['#fbd043', '#f44336', '#4CAF50', '#2196F3', '#9C27B0']}
      />

      <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} />
      <Animated.View 
        style={[
          styles.mascotContainer, 
          mascotAnimatedStyle, 
          { opacity: visible ? 0 : 1 }
        ]} 
        pointerEvents={visible ? "none" : "auto"}
      >
        <Image source={require('../../../../assets/images/nimo_blue_happy.png')} style={styles.mascotImage} />
      </Animated.View>
      <BadgePopup correctCount={sessionCorrectCount} />
      <View style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <WebView
          ref={webViewRef}
          source={{ html: `
            <!DOCTYPE html>
            <html>
            <head>
              <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" onload="window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }))"></script>
            </head>
            <body></body>
            </html>
          ` }}
          onMessage={handleWebViewMessage}
          originWhitelist={['*']}
          style={{ width: 0, height: 0 }}
        />
      </View>
    </View>
  );
}

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return '#4CAF50';
    case 'medium': return '#FF9800';
    case 'hard': return '#F44336';
    default: return '#90A4AE';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  linearHeader: {
    padding: 20,
    height: 150,
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    padding: 8,
    zIndex: 10,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  instructionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 15,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.navy,
    textAlign: 'center',
    fontWeight: '500',
  },
  cameraButton: {
    backgroundColor: '#4299E1',
    borderRadius: 50,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cameraButtonIcon: {
    fontSize: 40,
  },
  galleryButton: {
    backgroundColor: 'transparent',
    padding: 12,
    marginTop: 8,
  },
  galleryButtonText: {
    color: '#4299E1',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 12,
    marginTop: 16,
  },
  instruction: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: COLORS.teal,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.navy,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#48BB78',
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#F8D7DA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    fontSize: 14,
    color: '#721C24',
    fontWeight: '500',
  },
  detectedSection: {
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 14,
    marginVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detectedText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D3748',
    textAlign: 'center',
  },
  quizSection: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
  },
  quizQuestionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  optionButton: {
    backgroundColor: '#48BB78',
    borderRadius: 25,
    paddingVertical: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  correctOptionButton: {
    backgroundColor: '#38A169',
    borderWidth: 3,
    borderColor: '#9AE6B4',
  },
  wrongOptionButton: {
    backgroundColor: '#E53E3E',
    borderWidth: 3,
    borderColor: '#FEB2B2',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  mascotContainer: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    width: 80,
    height: 80,
    zIndex: 10,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  option: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  selectedOption: {
    borderColor: COLORS.teal,
    backgroundColor: '#E0F7F5',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#D4EDDA',
  },
  wrongOption: {
    borderColor: '#F44336',
    backgroundColor: '#F8D7DA',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  resultContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  correctAnswer: {
    fontSize: 14,
  },
  goBackButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
    backgroundColor: 'white',
  },
  goBackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.teal,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingScreenText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
  },
});
