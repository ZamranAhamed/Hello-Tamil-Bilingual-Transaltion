import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Games" }} />
      <Stack.Screen
        name="brokenletter"
        options={{ title: "Broken Letter" }}
      />
    </Stack>
  );
}
