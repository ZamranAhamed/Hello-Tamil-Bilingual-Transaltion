/**
 * OCR Service - Google Cloud Vision API for accurate Tamil text recognition.
 * Base64 conversion uses XHR + FileReader (built into React Native / Expo Go).
 * No expo-file-system required.
 */
import * as ImageManipulator from 'expo-image-manipulator';

const GOOGLE_VISION_API_KEY = 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
const GOOGLE_VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

// ─── Read local image URI as base64 via XHR + FileReader ─────────────────────
// Both XMLHttpRequest and FileReader are built into React Native / Expo Go.
const readImageAsBase64 = (uri: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const blob: Blob = xhr.response;
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the "data:image/jpeg;base64," prefix
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64 || '');
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    };
    xhr.onerror = () => reject(new Error('XHR failed to read image'));
    xhr.send();
  });

// ─── Google Cloud Vision OCR ──────────────────────────────────────────────────
const performGoogleVisionOCR = async (imageUri: string): Promise<string> => {
  // 1. Resize to reduce payload size
  const optimized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2. Convert to base64 (no expo-file-system needed)
  const base64Image = await readImageAsBase64(optimized.uri);
  if (!base64Image) throw new Error('Image to base64 conversion returned empty');

  // 3. Build Vision API request
  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['ta', 'ta-IN'] },
      },
    ],
  };

  // 4. Call Vision API
  const response = await fetch(GOOGLE_VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 403) {
      throw new Error(`403_FORBIDDEN_API_KEY`);
    }
    throw new Error(`Google Vision API error ${response.status}: ${errBody}`);
  }

  const json = await response.json();

  // 5. Extract text (fullTextAnnotation gives the best result)
  const fullText: string = json?.responses?.[0]?.fullTextAnnotation?.text || '';
  if (fullText) return fullText;

  const annotations: any[] = json?.responses?.[0]?.textAnnotations || [];
  return annotations.length > 0 ? (annotations[0]?.description || '') : '';
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const performOCR = async (imageUri: string): Promise<string> => {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('Invalid image URI provided.');
  }
  try {
    const rawText = await performGoogleVisionOCR(imageUri);
    console.log('[OCR] Raw Google Vision text:', rawText);
    return rawText;
  } catch (error: any) {
    if (error?.message === '403_FORBIDDEN_API_KEY') {
       // Return a special flag string that we can catch in the UI
       throw new Error('Google Cloud API Key is invalid or expired. Please update it in ocrService.ts');
    }
    console.error('[OCR] Google Vision failed:', error?.message || error);
    return '';
  }
};

export const extractAllTamilWords = (ocrText: string): string[] => {
  if (!ocrText) return [];

  const normalized = ocrText
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');

  const tamilRegex = /[\u0B80-\u0BFF][\u0B80-\u0BFF\u0BBE-\u0BCD]*/g;
  const rawMatches = normalized.match(tamilRegex) || [];

  const cleaned = rawMatches
    .map((m) => m.replace(/\s+/g, '').trim())
    .filter((m) => m.length >= 2);

  return [...new Set(cleaned)];
};

export const extractFirstTamilWord = (ocrText: string): string | null => {
  const words = extractAllTamilWords(ocrText);
  return words.length > 0 ? words[0] : null;
};

export const testOCR = async (): Promise<{ available: boolean; error?: string }> => {
  return { available: true };
};

export default function DummyRoute() { return null; }
