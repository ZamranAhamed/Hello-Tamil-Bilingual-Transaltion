import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Game config ──────────────────────────────────────────────────────────────
const GAMES = [
  { key: "All Games",      label: "All Games",       icon: "🎮", color: "#4FD1C5" },
  { key: "Picture Quiz",   label: "Picture Quiz",    icon: "📸", color: "#1E88E5" },
  { key: "Matching Game",  label: "Matching Game",   icon: "🔗", color: "#F9A825" },
  { key: "Word Hunt",      label: "Word Hunt",       icon: "🎯", color: "#E53935" },
  { key: "Scan & Learn",   label: "Scan & Learn",    icon: "📱", color: "#7B1FA2" },
  { key: "Daily Challenge",label: "Daily Challenge", icon: "🔥", color: "#FB8C00" },
];

// normalize aliases stored by individual game screens
const normalizeGame = (raw: string = ""): string => {
  const s = raw.trim().toLowerCase();
  if (s === "matching" || s === "matching game") return "Matching Game";
  if (s === "wordhunt" || s === "word hunt") return "Word Hunt";
  if (s === "picturequiz" || s === "picture quiz" || s === "imagequiz" || s === "image quiz") return "Picture Quiz";
  if (s === "scan & learn" || s === "scanlearn" || s === "scan and learn") return "Scan & Learn";
  if (s === "dailychallenge" || s === "daily challenge") return "Daily Challenge";
  return raw.trim();
};

// ── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  game_type?: string;
  is_correct: boolean;
  difficulty?: string;
  created_at?: string;
}

interface GameStat {
  key: string;
  label: string;
  icon: string;
  color: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

// ── Bar chart component (pure RN) ────────────────────────────────────────────
const BAR_WIDTH = SCREEN_WIDTH - 80;

const BarChart = ({
  bars,
  maxValue,
}: {
  bars: { label: string; value: number; color: string }[];
  maxValue: number;
}) => {
  if (maxValue === 0) {
    return (
      <Text style={{ color: COLORS.text, textAlign: "center", marginTop: 12 }}>
        No data yet
      </Text>
    );
  }
  return (
    <View style={{ marginTop: 12 }}>
      {bars.map((bar, i) => {
        const pct = maxValue > 0 ? bar.value / maxValue : 0;
        const barW = Math.max(pct * BAR_WIDTH, bar.value > 0 ? 6 : 0);
        return (
          <View key={i} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.barLabel}>{bar.label}</Text>
              <Text style={[styles.barValue, { color: bar.color }]}>{bar.value}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: barW, backgroundColor: bar.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ── Donut-style accuracy ring (simple arc via nested circles) ─────────────────
const AccuracyRing = ({
  accuracy,
  color,
}: {
  accuracy: number;
  color: string;
}) => {
  const SIZE = 120;
  const STROKE = 14;
  const pct = accuracy / 100;
  // We fake a donut with two overlapping views + clip
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Background ring */}
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color }}>
          {accuracy}%
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>
          Accuracy
        </Text>
      </View>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function InsightsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState("All Games");

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await AsyncStorage.getItem("isAdminAuthenticated");
        const ts = await AsyncStorage.getItem("adminAuthTimestamp");
        if (auth !== "true" || !ts) {
          router.replace("/modules/bilingual_translation/admin/adminLogin");
          return;
        }
        if (Date.now() - parseInt(ts, 10) > 5 * 60 * 1000) {
          await AsyncStorage.removeItem("isAdminAuthenticated");
          router.replace("/modules/bilingual_translation/admin/adminLogin");
        }
      } catch {
        router.replace("/modules/bilingual_translation/admin/adminLogin");
      }
    };
    checkAuth();
  }, [router]);

  // Load logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("game_logs");
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      setAllLogs(logs);
    } catch {
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ── Compute stats ────────────────────────────────────────────────────────
  const filteredLogs = selectedGame === "All Games"
    ? allLogs
    : allLogs.filter(l => normalizeGame(l.game_type) === selectedGame);

  const totalQ = filteredLogs.length;
  const totalCorrect = filteredLogs.filter(l => l.is_correct).length;
  const totalWrong = totalQ - totalCorrect;
  const overallAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  // Per-game stats for the "All Games" overview chart
  const gameStats: GameStat[] = GAMES.slice(1).map(g => {
    const logs = allLogs.filter(l => normalizeGame(l.game_type) === g.key);
    const total = logs.length;
    const correct = logs.filter(l => l.is_correct).length;
    return {
      ...g,
      total,
      correct,
      wrong: total - correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });

  // Difficulty breakdown
  const diffBreakdown = (() => {
    const counts = { easy: 0, medium: 0, hard: 0 };
    filteredLogs.forEach(l => {
      const d = (l.difficulty || "").toLowerCase();
      if (d === "easy") counts.easy++;
      else if (d === "medium") counts.medium++;
      else if (d === "hard") counts.hard++;
    });
    return counts;
  })();

  const activeGame = GAMES.find(g => g.key === selectedGame) || GAMES[0];

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={{ marginTop: 12, color: COLORS.text }}>Loading insights…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            playButtonClick();
            router.back();
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.navy} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>📊 Child Insights</Text>
          <Text style={styles.subtitle}>Activity & performance overview</Text>
        </View>
        <Pressable onPress={loadLogs} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={20} color={COLORS.teal} />
        </Pressable>
      </View>

      {/* Game Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {GAMES.map(g => {
          const active = selectedGame === g.key;
          return (
            <Pressable
              key={g.key}
              onPress={() => {
                playButtonClick();
                setSelectedGame(g.key);
              }}
              style={[
                styles.filterPill,
                active && { backgroundColor: g.color, borderColor: g.color },
              ]}
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>{g.icon}</Text>
              <Text
                style={[
                  styles.filterPillText,
                  active && { color: "#fff" },
                ]}
              >
                {g.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Summary card ────────────────────────────────────────────────── */}
      <View style={[styles.card, { borderTopWidth: 4, borderTopColor: activeGame.color }]}>
        <Text style={styles.cardTitle}>
          {activeGame.icon}  {selectedGame === "All Games" ? "Overall Summary" : `${selectedGame} Summary`}
        </Text>

        {totalQ === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No data for this game yet.</Text>
            <Text style={styles.emptySubtext}>Play some games to see insights here!</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, gap: 20 }}>
            <AccuracyRing accuracy={overallAccuracy} color={activeGame.color} />
            <View style={{ flex: 1, gap: 10 }}>
              <StatRow icon="help-circle-outline" label="Total" value={totalQ}       color="#6B7280" />
              <StatRow icon="check-circle-outline"  label="Correct" value={totalCorrect} color="#43A047" />
              <StatRow icon="close-circle-outline"  label="Wrong"   value={totalWrong}   color="#E53935" />
            </View>
          </View>
        )}
      </View>

      {/* ── Correct vs Wrong bar chart ───────────────────────────────────── */}
      {totalQ > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅  Correct vs ❌ Wrong</Text>
          <BarChart
            bars={[
              { label: "Correct", value: totalCorrect, color: "#43A047" },
              { label: "Wrong",   value: totalWrong,   color: "#E53935" },
            ]}
            maxValue={Math.max(totalCorrect, totalWrong, 1)}
          />
        </View>
      )}

      {/* ── Difficulty breakdown ─────────────────────────────────────────── */}
      {totalQ > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Questions by Difficulty</Text>
          <BarChart
            bars={[
              { label: "Easy",   value: diffBreakdown.easy,   color: "#1E88E5" },
              { label: "Medium", value: diffBreakdown.medium, color: "#F9A825" },
              { label: "Hard",   value: diffBreakdown.hard,   color: "#E53935" },
            ]}
            maxValue={Math.max(diffBreakdown.easy, diffBreakdown.medium, diffBreakdown.hard, 1)}
          />
        </View>
      )}

      {/* ── Per-game accuracy chart (only when All Games) ────────────────── */}
      {selectedGame === "All Games" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎮 Performance Per Game</Text>
          <BarChart
            bars={gameStats.map(g => ({
              label: `${g.icon} ${g.label}`,
              value: g.accuracy,
              color: g.color,
            }))}
            maxValue={100}
          />
          <Text style={styles.chartNote}>Values shown as accuracy %</Text>
        </View>
      )}

      {/* ── Per-game questions count (All Games) ─────────────────────────── */}
      {selectedGame === "All Games" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Questions Attempted Per Game</Text>
          <BarChart
            bars={gameStats.map(g => ({
              label: `${g.icon} ${g.label}`,
              value: g.total,
              color: g.color,
            }))}
            maxValue={Math.max(...gameStats.map(g => g.total), 1)}
          />
        </View>
      )}

      {/* ── Per-game mini scorecards (All Games) ─────────────────────────── */}
      {selectedGame === "All Games" && gameStats.some(g => g.total > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏅 Game Scorecards</Text>
          <View style={styles.scorecardGrid}>
            {gameStats.map(g => (
              <View
                key={g.key}
                style={[styles.scorecard, { borderTopColor: g.color, borderTopWidth: 3 }]}
              >
                <Text style={styles.scorecardIcon}>{g.icon}</Text>
                <Text style={styles.scorecardGame} numberOfLines={1}>{g.label}</Text>
                <Text style={[styles.scorecardAccuracy, { color: g.color }]}>
                  {g.accuracy}%
                </Text>
                <Text style={styles.scorecardSub}>{g.correct}/{g.total}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Small helper component ────────────────────────────────────────────────────
const StatRow = ({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <MaterialCommunityIcons name={icon as any} size={18} color={color} />
    <Text style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>{label}</Text>
    <Text style={{ fontSize: 16, fontWeight: "800", color }}>{value}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
  },
  refreshBtn: {
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.navy,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: COLORS.card,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navy,
    marginBottom: 4,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.navy,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.text,
  },
  barTrack: {
    height: 18,
    backgroundColor: "#F3F4F6",
    borderRadius: 9,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 9,
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  barValue: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },
  chartNote: {
    fontSize: 11,
    color: COLORS.text,
    textAlign: "right",
    marginTop: 8,
    fontStyle: "italic",
  },
  scorecardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  scorecard: {
    width: "47%",
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  scorecardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  scorecardGame: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 6,
  },
  scorecardAccuracy: {
    fontSize: 22,
    fontWeight: "800",
  },
  scorecardSub: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 2,
  },
});
