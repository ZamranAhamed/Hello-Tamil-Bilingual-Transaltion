import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../../../../constants/colors';

// Badge Definitions
export const BADGES = [
  { level: 3, name: 'Master', icon: '🥇', threshold: 30, color: '#FFD700' },
  { level: 2, name: 'Learner', icon: '🥈', threshold: 15, color: '#C0C0C0' },
  { level: 1, name: 'Beginner', icon: '🥉', threshold: 5, color: '#CD7F32' },
];

export const getBadgeForScore = (correctAnswers: number) => {
  return BADGES.find(b => correctAnswers >= b.threshold) || null;
};

interface ProgressBadgeProps {
  correctCount: number;
}

export const ProgressBadgeDisplay: React.FC<ProgressBadgeProps> = ({ correctCount }) => {
  const badge = getBadgeForScore(correctCount);
  
  // Next badge
  const nextBadge = badge 
    ? BADGES.find(b => b.level === badge.level + 1)
    : BADGES[BADGES.length - 1]; // Beginner if no badge

  const progressText = nextBadge 
    ? `${correctCount} / ${nextBadge.threshold} for next badge`
    : `Max badge reached!`;

  return (
    <View style={styles.badgeContainer}>
      {badge ? (
        <View style={styles.badgeContent}>
          <Text style={styles.badgeIcon}>{badge.icon}</Text>
          <View>
            <Text style={[styles.badgeName, { color: badge.color }]}>{badge.name} Badge</Text>
            <Text style={styles.badgeProgress}>{progressText}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.badgeContent}>
          <Text style={styles.badgeIcon}>🐣</Text>
          <View>
            <Text style={styles.badgeName}>Start Playing!</Text>
            <Text style={styles.badgeProgress}>{correctCount} / 10 for Beginner</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Key for storing total correct answers across all sessions
const TOTAL_CORRECT_KEY = 'user_total_correct_answers';
const BADGE_LEVEL_KEY = 'user_badge_level';

type BadgeInfo = { name: string, icon: string, color: string };

// Call this whenever a correct answer is given in any game
export const addCorrectAnswers = async (count: number): Promise<number> => {
  try {
    const storedTotal = await SecureStore.getItemAsync(TOTAL_CORRECT_KEY);
    const totalCorrect = storedTotal ? parseInt(storedTotal, 10) + count : count;
    await SecureStore.setItemAsync(TOTAL_CORRECT_KEY, totalCorrect.toString());
    return totalCorrect;
  } catch (e) {
    console.error('Error updating total correct answers:', e);
    return 0;
  }
};

export const reportCorrectAnswer = async (): Promise<BadgeInfo | null> => {
  try {
    const totalCorrect = await addCorrectAnswers(1);
    const currentBadge = getBadgeForScore(totalCorrect);
    if (!currentBadge) return null;

    const storedLevel = await SecureStore.getItemAsync(BADGE_LEVEL_KEY);
    const lastLevel = storedLevel ? parseInt(storedLevel, 10) : 0;

    if (currentBadge.level > lastLevel) {
      await SecureStore.setItemAsync(BADGE_LEVEL_KEY, currentBadge.level.toString());
      return currentBadge;
    }
    return null;
  } catch (e) {
    console.error('Error reporting correct answer for badge:', e);
    return null;
  }
};

// Get the total correct answers across all sessions
export const getTotalCorrectAnswers = async (): Promise<number> => {
  try {
    const stored = await SecureStore.getItemAsync(TOTAL_CORRECT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (e) {
    console.error('Error reading total correct answers:', e);
    return 0;
  }
};

export const BadgePopup: React.FC<ProgressBadgeProps> = ({ correctCount }) => {
  const [newBadge, setNewBadge] = useState<BadgeInfo | null>(null);
  const prevCorrectCount = useRef(0);
  
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Track correctCount changes and persist them for overall badge progression
  useEffect(() => {
    const syncBadgeProgress = async () => {
      try {
        if (correctCount === 0) {
          prevCorrectCount.current = 0;
          return;
        }

        const delta = correctCount - prevCorrectCount.current;
        if (delta > 0) {
          const totalCorrect = await addCorrectAnswers(delta);
          const currentBadge = getBadgeForScore(totalCorrect);
          if (!currentBadge) {
            prevCorrectCount.current = correctCount;
            return;
          }

          const storedLevel = await SecureStore.getItemAsync(BADGE_LEVEL_KEY);
          const lastLevel = storedLevel ? parseInt(storedLevel, 10) : 0;

          if (currentBadge.level > lastLevel) {
            await SecureStore.setItemAsync(BADGE_LEVEL_KEY, currentBadge.level.toString());
            setNewBadge(currentBadge);
          }
        }

        prevCorrectCount.current = correctCount;
      } catch (e) {
        console.error('Error checking badge update', e);
      }
    };

    void syncBadgeProgress();
  }, [correctCount]);

  useEffect(() => {
    if (newBadge) {
      triggerPopup();
    }
  }, [newBadge]);

  const triggerPopup = () => {
    // Reset
    scale.setValue(0.5);
    opacity.setValue(0);

    // Pop in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Float down to 1
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();

      // Fade out after 3 seconds
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setNewBadge(null));
      }, 3000);
    });
  };

  if (!newBadge) return null;

  return (
    <View style={styles.popupContainer} pointerEvents="none">
      <Animated.View style={[styles.popupBox, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.popupTitle}>New Badge Earned!</Text>
        <Text style={styles.popupIcon}>{newBadge.icon}</Text>
        <Text style={[styles.popupBadgeName, { color: newBadge.color }]}>
          {newBadge.name}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badgeIcon: {
    fontSize: 40,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  badgeProgress: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  popupContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  popupBox: {
    backgroundColor: COLORS.card,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  popupIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  popupBadgeName: {
    fontSize: 28,
    fontWeight: '900',
  },
});


export default function DummyRoute() { return null; }
