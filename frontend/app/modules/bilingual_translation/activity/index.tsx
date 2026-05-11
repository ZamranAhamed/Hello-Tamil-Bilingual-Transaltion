import { useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { COLORS } from "../../../../constants/colors";

export default function ActivityHome() {
  const router = useRouter();

  const activityOptions = [
    {
      title: "Activity Log",
      description: "View your translation activities and progress",
      icon: "📝",
      pathname: "/modules/bilingual_translation/activity/activityLog",
    },
    // Add more activities here as they are developed
  ];

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
      }}
      contentContainerStyle={{
        padding: 20,
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
          Activities
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: COLORS.text,
            textAlign: "center",
          }}
        >
          Practice and track your translation skills
        </Text>
      </View>

      {/* Activity Options */}
      {activityOptions.map((activity, index) => (
        <Pressable
          key={index}
          onPress={() => router.push(activity.pathname as any)}
          style={({ pressed }) => ({
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            borderLeftWidth: 5,
            borderLeftColor: COLORS.teal,
            opacity: pressed ? 0.8 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 28 }}>{activity.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: COLORS.navy,
                  marginBottom: 6,
                }}
              >
                {activity.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.text,
                }}
              >
                {activity.description}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}

      {activityOptions.length === 0 && (
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ fontSize: 18, color: COLORS.text, textAlign: "center" }}>
            More activities coming soon! Stay tuned for updates.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}