import { useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, Pressable, ScrollView, BackHandler, Platform, Dimensions } from "react-native";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";
import ConfettiCannon from "react-native-confetti-cannon";
import { StarRewardProvider, showStarReward } from "../components/StarReward";
import { BadgePopup } from "../components/ProgressBadge";

interface DifficultyStats {
  easy: number;
  medium: number;
  hard: number;
}

interface WordHuntResultScreenProps {
  route?: {
    params?: {
      score: number;
      totalQuestions: number;
      correctCount: number;
      wrongCount: number;
      accuracy: number;
      difficultyStats?: DifficultyStats;
      replayPath?: string;
    };
  };
}

export default function WordHuntResultScreen({ route }: WordHuntResultScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get parameters from search params or use defaults for testing
  const score = Number(params.score) || 0;
  const totalQuestions = Number(params.totalQuestions) || 5;
  const correctCount = Number(params.correctCount) || 0;
  const wrongCount = Number(params.wrongCount) || 0;
  const accuracy = Number(params.accuracy) || 0;
  const isDailyChallenge = params.isDailyChallenge === 'true';
  const replayPath = typeof params.replayPath === "string" ? params.replayPath : "/modules/bilingual_translation/games/wordhunt";
  const difficultyStats: DifficultyStats = params.difficultyStats ? 
    (typeof params.difficultyStats === 'string' ? JSON.parse(params.difficultyStats) : params.difficultyStats) : {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const onBackPress = () => {
        router.replace("/modules/bilingual_translation/games" as any);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  const handlePlayAgain = () => {
    playButtonClick();
    router.replace(replayPath as any);
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
      <View style={{ marginBottom: 32, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: COLORS.navy,
            marginBottom: 8,
          }}
        >
          {isDailyChallenge ? "🔥 Daily Challenge Complete!" : "🎉 Game Over"}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: COLORS.text,
          }}
        >
          {isDailyChallenge ? "Great job! Come back tomorrow for another challenge." : "Here's how you performed!"}
        </Text>
      </View>

      {/* Celebration Message */}
      {isHighScorer && !isDailyChallenge && (
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.text,
              marginBottom: 8,
              fontWeight: "600",
            }}
          >
            FINAL SCORE
          </Text>
          <Text
            style={{
              fontSize: 48,
              fontWeight: "bold",
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
            out of {totalQuestions} questions
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: COLORS.navy,
            marginBottom: 16,
          }}
        >
          Results Summary
        </Text>

        {/* Correct Answers */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Correct Answers</Text>
          <View
            style={{
              backgroundColor: "#D4EDDA",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#155724" }}>
              {correctCount}
            </Text>
          </View>
        </View>

        {/* Wrong Answers */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Wrong Answers</Text>
          <View
            style={{
              backgroundColor: "#F8D7DA",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#721C24" }}>
              {wrongCount}
            </Text>
          </View>
        </View>

        {/* Accuracy */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.text }}>Accuracy</Text>
          <View
            style={{
              backgroundColor: "#CCE5FF",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#004085" }}>
              {accuracy.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Difficulty Breakdown */}
      <View
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: COLORS.navy,
            marginBottom: 16,
          }}
        >
          Difficulty Breakdown
        </Text>

        {/* Easy */}
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.text }}>Easy</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#28A745" }}>
              {difficultyStats.easy} correct
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: COLORS.border,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.min((difficultyStats.easy / totalQuestions) * 100, 100)}%`,
                backgroundColor: "#28A745",
              }}
            />
          </View>
        </View>

        {/* Medium */}
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.text }}>Medium</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.yellow }}>
              {difficultyStats.medium} correct
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: COLORS.border,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.min((difficultyStats.medium / totalQuestions) * 100, 100)}%`,
                backgroundColor: COLORS.yellow,
              }}
            />
          </View>
        </View>

        {/* Hard */}
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.text }}>Hard</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC3545" }}>
              {difficultyStats.hard} correct
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: COLORS.border,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.min((difficultyStats.hard / totalQuestions) * 100, 100)}%`,
                backgroundColor: "#DC3545",
              }}
            />
          </View>
        </View>
      </View>

      {/* Play Again Button - Only show for non-daily challenge */}
      {!isDailyChallenge && (
        <Pressable
          onPress={handlePlayAgain}
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.teal : COLORS.teal,
            opacity: pressed ? 0.8 : 1,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          })}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Play Again
          </Text>
        </Pressable>
      )}

      {/* Home Button */}
      <Pressable
        onPress={() => {
          router.replace("/modules/bilingual_translation/games" as any);
        }}
        style={({ pressed }) => ({
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: COLORS.teal,
          opacity: pressed ? 0.8 : 1,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: isDailyChallenge ? 8 : 12,
        })}
      >
        <Text
          style={{
            color: COLORS.teal,
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          Back to Games
        </Text>
      </Pressable>
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
    <BadgePopup correctCount={correctCount} />
    <StarRewardProvider />
    </View>
  );
}
