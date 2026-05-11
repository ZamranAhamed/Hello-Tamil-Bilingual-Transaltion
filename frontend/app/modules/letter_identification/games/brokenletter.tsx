import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    Platform,
    Pressable,
    Text,
    View,
} from 'react-native';

import { COLORS } from '../../../../constants/colors';
import { TAMIL_LETTERS } from '../../../../constants/tamilLetters';
import { speak } from '../../../../lib/tts';

/* ================= Broken Letter View ================= */

type MaskType = 'top' | 'bottom' | 'middle';

function BrokenLetterView({
  letter,
  mask,
  size = 240,
}: {
  letter: string;
  mask: MaskType;
  size?: number;
}) {
  const rects = {
    top: { left: 0, top: 0, width: size, height: size * 0.28 },
    bottom: { left: 0, top: size * 0.72, width: size, height: size * 0.28 },
    middle: { left: 0, top: size * 0.38, width: size, height: size * 0.24 },
  } as const;

  const maskRect = rects[mask];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.navy,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.62,
          fontWeight: '900',
          color: COLORS.navy,
          textAlign: 'center',
          lineHeight: size,
          height: size,
          includeFontPadding: false,
          fontFamily: Platform.OS === 'android' ? 'NotoSansTamil' : undefined,
        }}
      >
        {letter}
      </Text>

      {/* Mask */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: maskRect.left,
          top: maskRect.top,
          width: maskRect.width,
          height: maskRect.height,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );
}

/* ================= Helpers ================= */

const MASKS: MaskType[] = ['top', 'bottom', 'middle'];
const TOTAL_ROUNDS = 20;
const OPTIONS_COUNT = 9;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ================= MAIN GAME ================= */

export default function BrokenLetterPuzzle() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  /* ⭐ Star animation */
  const starScale = useState(new Animated.Value(0))[0];
  const starOpacity = useState(new Animated.Value(0))[0];

  const playStarAnimation = () => {
    starScale.setValue(0);
    starOpacity.setValue(1);

    Animated.sequence([
      Animated.timing(starScale, {
        toValue: 1.3,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(starScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(starOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const screenWidth = Dimensions.get('window').width;
  const cardSize = (screenWidth - 32 - 24) / 3;

  const [{ target, options, correctIndex, mask }, setQ] =
    useState(makeQuestion());

  function makeQuestion() {
    const target = pick(TAMIL_LETTERS);
    const mask = pick(MASKS);

    const pool = new Set<string>([target]);
    while (pool.size < OPTIONS_COUNT) {
      pool.add(pick(TAMIL_LETTERS));
    }

    const options = Array.from(pool).sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(target);

    return { target, options, correctIndex, mask };
  }

  /* Speak instruction once */
  useEffect(() => {
    if (round === 1) {
      speak('உடைந்த எழுத்தை கண்டுபிடிக்கவும்');
    }
  }, [round]);

  const pickOption = (idx: number) => {
    if (locked) return;

    setLocked(true);
    setSelectedIndex(idx);

    const correct = idx === correctIndex;
    setIsCorrect(correct);

    if (correct) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ✅ Praise + speak the Tamil letter
      speak('மிகச் சிறப்பு!');
      setTimeout(() => {
        speak(target); // 🔊 speaks the letter
      }, 400);

      playStarAnimation();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speak('மீண்டும் முயற்சி செய்யுங்கள்');
    }

    setTimeout(() => {
      if (round >= TOTAL_ROUNDS) {
        Alert.alert(
          'விளையாட்டு முடிந்தது!',
          `மதிப்பெண்: ${score + (correct ? 1 : 0)} / ${TOTAL_ROUNDS}`
        );
      } else {
        setRound(r => r + 1);
        setQ(makeQuestion());
        setLocked(false);
        setSelectedIndex(null);
        setIsCorrect(null);
      }
    }, 900);
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'உடைந்த எழுத்து' }} />

      {/* ⭐ Star */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '38%',
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: starOpacity,
          transform: [{ scale: starScale }],
          zIndex: 10,
        }}
      >
        <Text style={{ fontSize: 120 }}>⭐</Text>
      </Animated.View>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>
          சுற்று {round} / {TOTAL_ROUNDS}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.navy }}>
          மதிப்பெண்: {score}
        </Text>
      </View>

      {/* Broken Letter */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <BrokenLetterView letter={target} mask={mask} />
      </View>

      <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 12 }}>
        உடைந்த எழுத்தை கண்டுபிடிக்கவும்:
      </Text>

      {/* Options */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;

          let bgColor = '#fff';
          let borderColor = COLORS.border;

          if (isSelected && isCorrect === true) {
            bgColor = '#DCFCE7';
            borderColor = '#22C55E';
          }

          if (isSelected && isCorrect === false) {
            bgColor = '#FEE2E2';
            borderColor = '#EF4444';
          }

          return (
            <Pressable
              key={idx}
              onPress={() => pickOption(idx)}
              style={{
                width: cardSize,
                height: cardSize,
                marginBottom: 12,
                borderRadius: 16,
                borderWidth: 2,
                borderColor,
                backgroundColor: bgColor,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: locked && !isSelected ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '900',
                  color: COLORS.navy,
                  fontFamily: Platform.OS === 'android' ? 'NotoSansTamil' : undefined,
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
