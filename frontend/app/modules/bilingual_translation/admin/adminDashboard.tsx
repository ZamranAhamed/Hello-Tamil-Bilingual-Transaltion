import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

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

  const handleResetActivity = () => {
    Alert.alert(
      "Reset Activity",
      "Are you sure you want to reset all learning activity?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsResetting(true);
            try {
              // Clear local AsyncStorage (app uses local storage only, no backend)
              await AsyncStorage.clear();

              Alert.alert(
                "Success",
                "Activity has been reset. App will behave like first use."
              );
            } catch (error) {
              console.error("Reset Activity Error:", error);
              Alert.alert("Error", "Could not reset activity. Please try again.");
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const menuOptions = [
    {
      title: "Reset Activity",
      description: "Clear and reset game activities",
      iconName: "refresh",
      action: handleResetActivity,
      color: COLORS.teal,
    },
    {
      title: "Mentor Notes",
      description: "Manage mentor notes and guidelines",
      iconName: "book-outline",
      pathname: "/modules/bilingual_translation/admin/mentorNotes",
      color: COLORS.yellow,
    },
    {
      title: "Insights",
      description: "View child activity graphs & game performance",
      iconName: "chart-line",
      pathname: "/modules/bilingual_translation/admin/insightsDashboard",
      color: "#7B1FA2",
    },
    {
      title: "View Reports",
      description: "View student performance reports",
      iconName: "file-chart",
      pathname: "/modules/bilingual_translation/reports/mentorView",
      color: COLORS.navy,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            playButtonClick();
            router.replace("/modules/bilingual_translation");
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.navy} />
          <Text style={styles.backButtonText}>Back to Hub</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Mentor Dashboard</Text>
        <Text style={styles.subtitle}>Manage translation module settings</Text>
      </View>

      {/* Options */}
      {menuOptions.map((option, index) => (
        <Pressable
          key={index}
          onPress={() => {
            playButtonClick();
            if (option.action) {
              option.action();
            } else if (option.pathname) {
              router.push(option.pathname as any);
            }
          }}
          disabled={isResetting}
          style={({ pressed }) => [
            styles.card,
            {
              borderLeftColor: option.color,
              opacity: pressed || isResetting ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.cardContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${option.color}15` }, // subtle background match
              ]}
            >
              {isResetting && option.title === "Reset Activity" ? (
                <ActivityIndicator color={option.color} size="small" />
              ) : (
                <MaterialCommunityIcons
                  name={option.iconName as any}
                  size={24}
                  color={option.color}
                />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardSubtitle}>{option.description}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={COLORS.text}
            />
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.navy,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.navy,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.text,
  },
});
