import { Link } from "expo-router";
import { Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../../../constants/colors";

export default function GamesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "900",
          color: COLORS.navy,
          marginBottom: 16,
        }}
      >
        🎮 Games
      </Text>

      {/* Broken Letter Game Card */}
      <Link href="/modules/letter_identification/games/brokenletter" asChild>
        <Pressable
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.navy }}>
            🧩 Broken Letter
          </Text>
          <Text style={{ color: COLORS.text, marginTop: 6 }}>
            Guess the missing Tamil letter parts
          </Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
