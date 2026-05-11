import { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Pressable, ScrollView, BackHandler, Platform, Dimensions } from 'react-native';
import { COLORS } from '../../../../constants/colors';
import { playButtonClick } from '../services/soundService';
import ConfettiCannon from "react-native-confetti-cannon";
import { StarRewardProvider, showStarReward } from "../components/StarReward";
import { BadgePopup } from "../components/ProgressBadge";

interface MatchingGameResultScreenProps {
  route?: {
    params?: {
      score: number;
      totalPairs: number;
      correctMatches: number;
      wrongMatches: number;
      accuracy: number;
    };
  };
}

export default function MatchingGameResultScreen({
  route,
}: MatchingGameResultScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get parameters from search params or use defaults
  const score = Number(params.score) || 0;
  const totalPairs = Number(params.totalPairs) || 6;
  const correctMatches = Number(params.correctMatches) || 0;
  const wrongMatches = Number(params.wrongMatches) || 0;
  const accuracy = Number(params.accuracy) || 0;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const onBackPress = () => {
        router.replace('/modules/bilingual_translation/games');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  const handlePlayAgain = () => {
    playButtonClick();
    router.replace('/modules/bilingual_translation/games/matching');
  };

  const handleBackToGames = () => {
    router.replace('/modules/bilingual_translation/games');
  };

  const getAccuracyColor = () => {
    if (accuracy >= 80) return '#28A745';
    if (accuracy >= 60) return COLORS.yellow;
    return '#F44336';


  };

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return '🏆 Outstanding!';
    if (accuracy >= 80) return '⭐ Excellent!';
    if (accuracy >= 70) return '👍 Good Job!';
    if (accuracy >= 60) return '📈 Keep Practicing!';
    return '💪 Try Again!';
  };

  const isHighScorer = accuracy > 70;

  useFocusEffect(
    useCallback(() => {
      if (isHighScorer) {
        setTimeout(() => {
          showStarReward();
        }, 500);
      }
    }, [isHighScorer])
  );

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
      }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <View style={{ marginBottom: 32, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: COLORS.navy,
            marginBottom: 8,
          }}
        >
          {getPerformanceMessage()}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: COLORS.text,
          }}
        >
          You completed the matching game!
        </Text>
      </View>

      {/* Celebration Message */}
      {isHighScorer && (
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "900",
              color: "#FFD700",
              textShadowColor: "rgba(0, 0, 0, 0.2)",
              textShadowOffset: { width: 1, height: 2 },
              textShadowRadius: 3,
            }}
          >
            Great Job!
          </Text>
        </View>
      )}

      {/* Score Card */}
      <View
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
          borderLeftWidth: 5,
          borderLeftColor: COLORS.teal,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.text,
              marginBottom: 8,
              fontWeight: '600',
            }}
          >
            FINAL SCORE
          </Text>
          <Text
            style={{
              fontSize: 48,
              fontWeight: '700',
              color: COLORS.teal,
              marginBottom: 8,
            }}
          >
            {score}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: COLORS.text,
            }}
          >
            points
          </Text>
        </View>
      </View>

      {/* Results Summary */}
      <View
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: COLORS.navy,
            marginBottom: 16,
          }}
        >
          Results Summary
        </Text>

        {/* Total Pairs */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Total Pairs</Text>
          <View
            style={{
              backgroundColor: '#CCE5FF',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#004085' }}>
              {totalPairs}
            </Text>
          </View>
        </View>

        {/* Correct Matches */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Correct Matches</Text>
          <View
            style={{
              backgroundColor: '#D4EDDA',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#155724' }}>
              {correctMatches}
            </Text>
          </View>
        </View>

        {/* Wrong Matches */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Wrong Matches</Text>
          <View
            style={{
              backgroundColor: '#F8D7DA',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#721C24' }}>
              {wrongMatches}
            </Text>
          </View>
        </View>

        {/* Accuracy */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Accuracy</Text>
          <View
            style={{
              backgroundColor: '#E8F5E9',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: getAccuracyColor(),
              }}
            >
              {accuracy.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ gap: 12, marginBottom: 12 }}>
        {/* Play Again Button */}
        <Pressable
          onPress={handlePlayAgain}
          style={({ pressed }) => ({
            backgroundColor: COLORS.teal,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#FFFFFF',
            }}
          >
            Play Again
          </Text>
        </Pressable>

        {/* Back to Games Button */}
        <Pressable
          onPress={handleBackToGames}
          style={({ pressed }) => ({
            backgroundColor: COLORS.yellow,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: COLORS.navy,
            }}
          >
            Back to Games
          </Text>
        </Pressable>
      </View>
    </ScrollView>

    {isHighScorer && (
      <ConfettiCannon
        count={200}
        origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
        autoStart={true}
        fadeOut={true}
        fallSpeed={3000}
      />
    )}
    <BadgePopup correctCount={correctMatches} />
    <StarRewardProvider />
    </View>
  );
}
