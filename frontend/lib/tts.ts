import * as Speech from 'expo-speech';

export function speak(text: string) {
  Speech.speak(text, {
    language: 'ta-IN',
    rate: 0.9,
  });
}
