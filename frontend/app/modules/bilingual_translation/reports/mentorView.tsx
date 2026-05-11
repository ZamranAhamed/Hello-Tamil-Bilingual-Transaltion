import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_URL } from "../../../../services/api";
import { COLORS } from "../../../../constants/colors";

type DifficultyBreakdown = {
  easy: number;
  medium: number;
  hard: number;
};

type PerformanceSummary = {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  difficultyBreakdown: DifficultyBreakdown;
};

const MentorView = () => {
  const { player_name, game_type } = useLocalSearchParams<{
    player_name?: string;
    game_type?: string;
  }>();

  const router = useRouter();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await AsyncStorage.getItem("isAdminAuthenticated");
        const timestampStr = await AsyncStorage.getItem("adminAuthTimestamp");
        if (auth !== "true" || !timestampStr) {
          router.replace("/modules/bilingual_translation/admin/adminLogin");
          return;
        }
        const timestamp = parseInt(timestampStr, 10);
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          await AsyncStorage.removeItem("isAdminAuthenticated");
          router.replace("/modules/bilingual_translation/admin/adminLogin");
        }
      } catch (error) {
        router.replace("/modules/bilingual_translation/admin/adminLogin");
      }
    };
    checkAuth();
  }, [router]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stored = await AsyncStorage.getItem('game_logs');
      const allLogs: any[] = stored ? JSON.parse(stored) : [];

      // Filter by player_name and/or game_type if provided
      const filtered = allLogs.filter(log => {
        const matchPlayer = typeof player_name === "string" && player_name.trim()
          ? log.player_name === player_name.trim()
          : true;
        const matchGame = typeof game_type === "string" && game_type.trim()
          ? log.game_type === game_type.trim()
          : true;
        return matchPlayer && matchGame;
      });

      const totalQuestions = filtered.length;
      const correctAnswers = filtered.filter(l => l.is_correct).length;
      const wrongAnswers = totalQuestions - correctAnswers;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
      filtered.forEach(l => {
        if (!l.is_correct) return;
        const d = (l.difficulty || '').toLowerCase();
        if (d === 'easy') difficultyBreakdown.easy++;
        else if (d === 'medium') difficultyBreakdown.medium++;
        else if (d === 'hard') difficultyBreakdown.hard++;
      });

      setSummary({ totalQuestions, correctAnswers, wrongAnswers, accuracy, difficultyBreakdown });
    } catch (err) {
      setError((err as Error).message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [game_type, player_name]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const feedbackMessages = useMemo(() => {
    if (!summary) {
      return [];
    }

    const feedback: string[] = [];

    if (summary.accuracy < 50) {
      feedback.push("You need more practice with vocabulary.");
    }

    if (summary.totalQuestions > 0) {
      const mediumLowThreshold = Math.max(3, Math.ceil(summary.correctAnswers * 0.25));
      if (summary.difficultyBreakdown.medium < mediumLowThreshold) {
        feedback.push("Try practicing medium level questions.");
      }

      const hardLowThreshold = Math.max(2, Math.ceil(summary.correctAnswers * 0.15));
      if (summary.difficultyBreakdown.hard < hardLowThreshold) {
        feedback.push("Practice advanced vocabulary using Word Hunt.");
      }
    }

    return feedback;
  }, [summary]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.navy} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Mentor Report</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Loading performance summary...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>Failed to load summary: {error}</Text>
          <Pressable onPress={fetchSummary} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && summary ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="chart-bar" size={24} color={COLORS.teal} />
              <Text style={styles.cardTitle}>Performance Summary</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total questions answered</Text>
              <Text style={styles.value}>{summary.totalQuestions}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total correct answers</Text>
              <Text style={styles.value}>{summary.correctAnswers}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total wrong answers</Text>
              <Text style={styles.value}>{summary.wrongAnswers}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Accuracy percentage</Text>
              <Text style={styles.value}>{summary.accuracy}%</Text>
            </View>

            <Text style={styles.subTitle}>Correct Answers by Difficulty</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Easy</Text>
              <Text style={styles.value}>{summary.difficultyBreakdown.easy}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Medium</Text>
              <Text style={styles.value}>{summary.difficultyBreakdown.medium}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hard</Text>
              <Text style={styles.value}>{summary.difficultyBreakdown.hard}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={"#F59E0B"} />
              <Text style={styles.cardTitle}>Learning Feedback</Text>
            </View>
            {feedbackMessages.length === 0 ? (
              <Text style={styles.feedbackText}>No immediate learning alerts.</Text>
            ) : (
              feedbackMessages.map((message, index) => (
                <Text key={`${message}-${index}`} style={styles.feedbackText}>
                  {message}
                </Text>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.navy,
  },
  loadingContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 15,
    marginTop: 12,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.navy,
    marginLeft: 8,
  },
  subTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.navy,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navy,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  feedbackText: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: "500",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  errorText: {
    color: "#B00020",
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default MentorView;
