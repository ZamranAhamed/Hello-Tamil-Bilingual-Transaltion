import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL, saveGameLog } from '../../../../services/api';

// Placeholder for OCR function - in a real implementation, integrate with an OCR service
const performOCR = async (imageUri: string): Promise<string> => {
  // This is a placeholder. In production, you would:
  // 1. Send the image to an OCR API (e.g., Google Vision API, OCR.space)
  // 2. Or use a React Native OCR library if compatible with Expo
  // 
  // IMPORTANT: For Tamil language text detection:
  // - Configure OCR engine with Tamil language support (lang: 'tam', 'ta', or 'ta_IN')
  // - Process all text blocks from the OCR result (do NOT just read result[0])
  // - Combine all detected text blocks into a single string
  // - Normalize Unicode to NFC (Normal Form Composed) for proper Tamil character rendering
  //
  // Example implementation:
  // const result = await ocrService.detect(imageUri, { 
  //   languages: ['tam', 'eng'],  // Tamil + English
  //   script: 'Tamil'
  // });
  // const textBlocks = result.textAnnotations || result.blocks || result.responses?.[0]?.fullTextAnnotation?.pages?.[0]?.blocks || [];
  // const detectedTexts = textBlocks
  //   .map((block: any) => block.text?.trim() || '')
  //   .filter((text: string) => text.length > 0);
  // const combinedText = detectedTexts.join(' ').trim().normalize('NFC');
  // return combinedText;
  
  // For now, returning a sample Tamil letter
  return 'அ'; // Sample detected text
};

// Dataset of words. In a real app you would fetch this from your server or load
// from a local JSON file generated from the CSV. Only a few entries are shown here
// for demonstration; you can expand the list or dynamically load it as needed.
// Each dataset entry now carries extra metadata so quiz and logging can use it
const wordsDataset: Array<{ tamil: string; english: string; sinhala: string; difficulty: string; category: string }> = [
  { tamil: 'அ', english: 'A', sinhala: 'අ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'ஆ', english: 'Aa', sinhala: 'ආ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'இ', english: 'I', sinhala: 'ඉ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'ஈ', english: 'Ii', sinhala: 'ඊ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'உ', english: 'U', sinhala: 'උ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'ஓ', english: 'O', sinhala: 'ඔ', difficulty: 'Easy', category: 'Letters' },
  { tamil: 'க', english: 'Ka', sinhala: 'ක', difficulty: 'Medium', category: 'Consonants' },
  { tamil: 'ச', english: 'Cha', sinhala: 'ච', difficulty: 'Medium', category: 'Consonants' },
  { tamil: 'த', english: 'Ta', sinhala: 'ට', difficulty: 'Medium', category: 'Consonants' },
  { tamil: 'ந', english: 'Na', sinhala: 'න', difficulty: 'Medium', category: 'Consonants' },
];

// helper to find translation for a tamil word by looking in the dataset
const getTranslationEntry = (tamilWord: string) => {
  return wordsDataset.find((w) => w.tamil === tamilWord);
};

// Generate quiz options using the dataset; wrong answers are drawn randomly
// from other entries so that there are 4 choices total (1 correct + 3 wrong).
const generateQuizOptions = (tamilWord: string) => {
  const entry = getTranslationEntry(tamilWord);
  if (!entry) {
    return null; // no quiz if the word isn't in our dataset
  }

  const correctOption = `${entry.english} - ${entry.sinhala}`;

  // gather wrong options from other words
  const otherEntries = wordsDataset.filter((w) => w.tamil !== tamilWord);
  // shuffle and take first 3
  for (let i = otherEntries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherEntries[i], otherEntries[j]] = [otherEntries[j], otherEntries[i]];
  }
  const wrongEntries = otherEntries.slice(0, 3);
  const wrongOptions = wrongEntries.map((w) => `${w.english} - ${w.sinhala}`);

  const allOptions = [correctOption, ...wrongOptions];
  // final shuffle
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
  }

  return {
    question: `What is the meaning of "${tamilWord}"?`,
    options: allOptions,
    correctAnswer: correctOption,
    difficulty: entry.difficulty,
    category: entry.category,
  };
};

export default function ImageQuiz({ playerName = 'Player' }: { playerName?: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [detectedText, setDetectedText] = useState<string>('');
  const [quiz, setQuiz] = useState<{
    question: string;
    options: string[];
    correctAnswer: string;
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);

  const pickImage = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to use this feature');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);

      try {
        // Perform OCR
        const text = await performOCR(imageUri);
        setDetectedText(text);

        // Generate quiz based on dataset match
        const quizData = generateQuizOptions(text);
        if (!quizData) {
          alert('No matching word found in the dataset. Try a different image.');
          setDetectedText(text); // still show detected text
          setQuiz(null);
          return;
        }
        setQuiz(quizData);
        setSelectedAnswer('');
        setShowResult(false);
      } catch (error) {
        alert('Error processing image. Please try again.');
        console.error(error);
      }
    }
  };

  const pickImageFromGallery = async () => {
    // Request library (gallery) permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Gallery permission is required to use this feature');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);

      try {
        // Perform OCR
        const text = await performOCR(imageUri);
        setDetectedText(text);

        // Generate quiz based on dataset match
        const quizData = generateQuizOptions(text);
        if (!quizData) {
          alert('No matching word found in the dataset. Try a different image.');
          setDetectedText(text); // still show detected text
          setQuiz(null);
          return;
        }
        setQuiz(quizData);
        setSelectedAnswer('');
        setShowResult(false);
      } catch (error) {
        alert('Error processing image. Please try again.');
        console.error(error);
      }
    }
  };

  // send log to backend with details of the attempt
  const sendGameLog = async (
    tamilWord: string,
    selectedAnswer: string,
    correctAnswer: string,
    difficulty: string,
    category: string,
    isCorrect: boolean
  ) => {
    const gameLog = {
      player_name: playerName,
      tamil_word: tamilWord,
      selected_answer: selectedAnswer,
      correct_answer: correctAnswer,
      difficulty,
      category,
      is_correct: isCorrect,
      game_type: 'ImageQuiz',
      created_at: new Date(),
    };

    await saveGameLog(gameLog);
  };

  const handleAnswerSelect = (answer: string) => {
    // log immediately then show result
    if (quiz) {
      const englishPart = answer.split(' - ')[0];
      const correctEnglish = quiz.correctAnswer.split(' - ')[0];
      const isCorrect = englishPart === correctEnglish;
      const difficulty = (quiz as any).difficulty || 'Medium';
      const category = (quiz as any).category || 'image';
      sendGameLog(detectedText, englishPart, correctEnglish, difficulty, category, isCorrect);
    }
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const resetQuiz = () => {
    setImage(null);
    setDetectedText('');
    setQuiz(null);
    setSelectedAnswer('');
    setShowResult(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Image Quiz</Text>

      {!image && (
        <View style={styles.section}>
          <Text style={styles.instruction}>
            Capture an image of a Tamil letter to start the quiz!
          </Text>
          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <Button title="Capture Image" onPress={pickImage} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button title="Choose From Gallery" onPress={pickImageFromGallery} />
            </View>
          </View>
        </View>
      )}

      {image && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Captured Image:</Text>
          <Image source={{ uri: image }} style={styles.image} />

          {detectedText && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>Detected Text:</Text>
              <Text style={styles.detectedText}>{detectedText}</Text>
            </View>
          )}

          {quiz && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: getDifficultyColor(String((quiz as any).difficulty || 'Medium')),
                    marginBottom: 6,
                  },
                ]}
              >
                Difficulty: {String((quiz as any).difficulty || 'Medium')}
              </Text>
              <Text style={styles.subtitle}>Quiz Question:</Text>
              <Text style={styles.question}>{quiz.question}</Text>

              <Text style={styles.subtitle}>Options:</Text>
              {quiz.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    selectedAnswer === option && styles.selectedOption,
                    showResult && option === quiz.correctAnswer && styles.correctOption,
                    showResult && selectedAnswer === option && selectedAnswer !== quiz.correctAnswer && styles.wrongOption,
                  ]}
                  onPress={() => !showResult && handleAnswerSelect(option)}
                  disabled={showResult}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}

              {showResult && (
                <View style={styles.result}>
                  <View style={styles.resultHeader}>
                    <MaterialCommunityIcons
                      name={selectedAnswer === quiz.correctAnswer ? 'check-circle' : 'close-circle'}
                      size={22}
                      color={selectedAnswer === quiz.correctAnswer ? '#2E7D32' : '#C62828'}
                    />
                    <Text style={styles.resultText}>
                      {selectedAnswer === quiz.correctAnswer ? 'Correct!' : 'Incorrect!'}
                    </Text>
                  </View>
                  <Text style={styles.correctAnswer}>
                    Correct answer: {quiz.correctAnswer}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Button title="Try Another Image" onPress={resetQuiz} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  detectedText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
  },
  question: {
    fontSize: 16,
    marginBottom: 10,
  },
  option: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#e0e0e0',
  },
  correctOption: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  wrongOption: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  optionText: {
    fontSize: 16,
  },
  result: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 6,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  correctAnswer: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    marginTop: 15,
  },
  buttonWrapper: {
    flex: 1,
  },
});

const getDifficultyColor = (difficulty: string): string => {
  switch ((difficulty || '').toLowerCase()) {
    case 'easy':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'hard':
      return '#F44336';
    default:
      return '#333333';
  }
};
