import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageMode = 'T2S' | 'S2T';

let currentMode: LanguageMode = 'T2S';
let isInitialized = false;

export const initLanguageMode = async (): Promise<LanguageMode> => {
  if (isInitialized) return currentMode;
  try {
    const saved = await AsyncStorage.getItem('bilingual_language_mode');
    if (saved === 'T2S' || saved === 'S2T') {
      currentMode = saved;
    }
    isInitialized = true;
    return currentMode;
  } catch (error) {
    console.error('Error initializing language mode:', error);
    return currentMode;
  }
};

export const setLanguageMode = async (mode: LanguageMode): Promise<void> => {
  currentMode = mode;
  try {
    await AsyncStorage.setItem('bilingual_language_mode', mode);
  } catch (error) {
    console.error('Error setting language mode:', error);
  }
};

export const toggleLanguageMode = async (): Promise<LanguageMode> => {
  const newMode = currentMode === 'T2S' ? 'S2T' : 'T2S';
  await setLanguageMode(newMode);
  return newMode;
};

export const getLanguageMode = (): LanguageMode => currentMode;
