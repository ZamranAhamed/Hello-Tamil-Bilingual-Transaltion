import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SectionList, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL, getGameLogs } from '../../../../services/api';
import { COLORS } from '../../../../constants/colors';
import { playButtonClick } from '../services/soundService';
import { ProgressBadgeDisplay, BadgePopup } from '../components/ProgressBadge';

interface GameLog {
  _id: string;
  player_name: string;
  tamil_word: string;
  english_meaning?: string;
  sinhala_meaning?: string;
  selected_answer: string;
  correct_answer: string;
  difficulty: string;
  category: string;
  game_type?: string;
  is_correct: boolean;
  time_taken?: number;
  created_at: string;
}

interface GroupedLogs {
  gameType?: string;
  title: string;
  icon: string;
  data: GameLog[];
}

interface GameTypeConfig {
  type: string;
  icon: string;
  aliases?: string[];
}

const GAME_TYPES: GameTypeConfig[] = [
  { type: 'Word Hunt', icon: '🔍' },
  { type: 'Matching Game', icon: '🎯', aliases: ['Matching'] },
  { type: 'Picture Quiz', icon: '📸', aliases: ['ImageQuiz', 'Image Quiz'] },
  { type: 'Scan & Learn', icon: '📱' },
  { type: 'Daily Challenge', icon: '🔥' },
];

const GAME_TYPE_ALIASES = GAME_TYPES.reduce<Record<string, string>>((map, game) => {
  const aliases = [game.type, ...(game.aliases || [])];
  aliases.forEach((alias) => {
    map[alias.toLowerCase()] = game.type;
  });
  return map;
}, {});

const normalizeGameType = (gameType?: string): string => {
  const normalized = typeof gameType === 'string' ? gameType.trim() : '';
  if (!normalized) {
    return 'Unknown';
  }
  return GAME_TYPE_ALIASES[normalized.toLowerCase()] || normalized;
};

const ActivityLogScreen: React.FC = () => {
  const router = useRouter();
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogs[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await getGameLogs();
      groupLogsByGameType(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupLogsByGameType = (logs: GameLog[]) => {
    // Initialize groups for each game type
    const grouped: { [key: string]: GameLog[] } = {};

    GAME_TYPES.forEach(({ type }) => {
      grouped[type] = [];
    });

    // Ensure other game types are also captured
    logs.forEach((log) => {
      const gameType = normalizeGameType(log.game_type);
      if (!grouped[gameType]) {
        grouped[gameType] = [];
      }
      grouped[gameType].push({
        ...log,
        game_type: gameType,
      });
    });

    // Convert to sections and sort by most recent
    const sections: GroupedLogs[] = GAME_TYPES
      .filter((game) => grouped[game.type] && grouped[game.type].length > 0)
      .map((game) => ({
        title: `${game.type} History`,
        icon: game.icon,
        data: grouped[game.type].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));

    // Add any unknown game types at the end
    const unknownLogs = grouped['Unknown'] || [];
    if (unknownLogs.length > 0) {
      sections.push({
        title: '❓ Other Games',
        icon: '❓',
        data: unknownLogs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      });
    }

    // Keep other unmapped types visible instead of dropping them.
    const predefinedTypes = new Set([...GAME_TYPES.map((game) => game.type), 'Unknown']);
    Object.entries(grouped)
      .filter(([type, logsForType]) => !predefinedTypes.has(type) && logsForType.length > 0)
      .forEach(([type, logsForType]) => {
        sections.push({
          title: `${type} History`,
          icon: '❓',
          data: logsForType.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        });
      });

    setGroupedLogs(sections);
  };

  const getFilteredSections = (): GroupedLogs[] => {
    if (!selectedGameType) {
      return groupedLogs; // Show all sections
    }
    return groupedLogs.filter(section =>
      section.title.includes(selectedGameType) ||
      section.data.some(log => log.game_type === selectedGameType)
    );
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#81C784';
      case 'medium':
        return '#FFB74D';
      case 'hard':
        return '#E57373';
      default:
        return '#90A4AE';
    }
  };

  const renderGameLog = ({ item }: { item: GameLog }) => {
    const isCorrect = item.is_correct;
    const dateObj = new Date(item.created_at);
    const isValidDate = !isNaN(dateObj.getTime());

    return (
      <View style={[styles.logCard, { borderLeftColor: isCorrect ? '#4CAF50' : '#F44336' }]}>
        {/* Header: Tamil word + Result indicator */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tamilWord}>{item.tamil_word}</Text>
            {item.english_meaning ? (
              <Text style={styles.englishMeaning}>{item.english_meaning}</Text>
            ) : null}
          </View>
          <View
            style={styles.resultIndicator}
          >
            <MaterialCommunityIcons
              name={isCorrect ? 'check-circle' : 'close-circle'}
              size={28}
              color={isCorrect ? '#4CAF50' : '#F44336'}
            />
          </View>
        </View>

        {/* Metadata badges */}
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: getDifficultyColor(item.difficulty) },
            ]}
          >
            <Text style={styles.badgeText}>{item.difficulty}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: COLORS.navy }]}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          {item.time_taken ? (
            <View style={[styles.badge, { backgroundColor: '#616161' }]}>
              <Text style={styles.badgeText}>{item.time_taken}s</Text>
            </View>
          ) : null}
        </View>

        {/* Date & Time */}
        <Text style={styles.dateText}>
          {isValidDate
            ? dateObj.toLocaleDateString() +
              ' at ' +
              dateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Date unavailable'}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({
    section: { title, icon, data },
  }: {
    section: GroupedLogs;
  }) => {
    const correctCount = data.filter((log) => log.is_correct).length;
    const accuracy =
      data.length > 0 ? Math.round((correctCount / data.length) * 100) : 0;

    return (
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionStats}>
              {data.length} entries • {accuracy}% accuracy
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getTotalStats = () => {
    const filteredSections = getFilteredSections();
    const allLogs = filteredSections.flatMap((section) => section.data);
    const totalCorrect = allLogs.filter((log) => log.is_correct).length;
    const totalAccuracy =
      allLogs.length > 0
        ? Math.round((totalCorrect / allLogs.length) * 100)
        : 0;

    return { total: allLogs.length, correct: totalCorrect, accuracy: totalAccuracy };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const stats = getTotalStats();

  return (
    <View style={styles.container}>
      <SectionList
        sections={getFilteredSections()}
        keyExtractor={(item, index) => item._id ? String(item._id) : String(index)}
        renderItem={renderGameLog}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        onRefresh={() => {
          setRefreshing(true);
          fetchLogs();
        }}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.headerContent, { flexDirection: 'row', alignItems: 'center' }]}>
              <Pressable
                onPress={() => {
                  router.replace("/modules/bilingual_translation" as any);
                }}
                style={({ pressed }) => ({
                  marginRight: 16,
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: COLORS.bg,
                  padding: 8,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                })}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.navy} />
              </Pressable>
              <View>
                <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Activity</Text>
                <Text style={styles.headerSubtitle}>Track your learning progress</Text>
              </View>
            </View>

            {/* Game Type Filter Buttons */}
            <View style={styles.filterContainer}>
              <Pressable
                style={[styles.filterButton, !selectedGameType && styles.filterButtonActive]}
                onPress={() => setSelectedGameType(null)}
              >
                <Text style={[styles.filterButtonText, !selectedGameType && styles.filterButtonTextActive]}>
                  All Games
                </Text>
              </Pressable>
              {GAME_TYPES.map((game) => (
                <Pressable
                  key={game.type}
                  style={[styles.filterButton, selectedGameType === game.type && styles.filterButtonActive]}
                  onPress={() => setSelectedGameType(game.type)}
                >
                  <Text style={[styles.filterButtonText, selectedGameType === game.type && styles.filterButtonTextActive]}>
                    {game.type}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Summary Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Questions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                  {stats.correct}
                </Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.teal }]}>
                  {stats.accuracy}%
                </Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>
            <ProgressBadgeDisplay correctCount={stats.correct} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Complete games to see your activity here
            </Text>
          </View>
        }
      />
      <BadgePopup correctCount={stats.correct} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  sectionStats: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  logCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tamilWord: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  englishMeaning: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
  resultIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  filterButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});

export default ActivityLogScreen;