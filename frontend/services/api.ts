
import AsyncStorage from '@react-native-async-storage/async-storage';
import wordsData from './wordsData.json';
import { imageMap } from './imageMap';

export const saveGameLog = async (log: any) => {
  try {
    const existingLogsStr = await AsyncStorage.getItem('game_logs');
    const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
    
    const newLog = {
      _id: Date.now().toString() + Math.random().toString(36).substring(7),
      ...log,
      created_at: log.created_at || new Date().toISOString()
    };
    
    existingLogs.push(newLog);
    await AsyncStorage.setItem('game_logs', JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Failed to save game log locally:', error);
  }
};

export const getGameLogs = async () => {
  try {
    const existingLogsStr = await AsyncStorage.getItem('game_logs');
    return existingLogsStr ? JSON.parse(existingLogsStr) : [];
  } catch (error) {
    console.error('Failed to get game logs locally:', error);
    return [];
  }
};


const API_PORT = "5000";

const resolveApiUrl = () => {
  return `http://localhost:${API_PORT}/api`;
};

export const API_URL = resolveApiUrl();

type GetWordsOptions = {
  hasImage?: boolean;
};

const wordsWithImages = wordsData.map((w: any) => ({
  ...w,
  image_url: imageMap[(w.english_meaning || '').toLowerCase()] || null
}));

export const getWords = async (options?: GetWordsOptions) => {
  if (options?.hasImage) {
    return wordsWithImages.filter(w => w.image_url);
  }
  return wordsWithImages;
};

export const getPictureQuizWords = async () => {
  return wordsWithImages.filter(w => w.image_url);
};

export const getWordByTamil = async (tamilWord: string) => {
  const word = wordsWithImages.find((w: any) => w.tamil_word === tamilWord);
  return word || null;
};
