import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx only */}
      <Stack.Screen name="index" />
    </Stack>
  );
}
