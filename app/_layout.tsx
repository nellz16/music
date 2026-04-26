/**
 * app/_layout.tsx — Root layout for expo-router.
 *
 * Initializes the audio session (background playback) once on app start.
 * The PlayerBar is rendered here so it persists across all routes.
 */

import { useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { initPlayer } from "@/modules/streamPlayer";
import PlayerBar from "@/components/PlayerBar";
import { usePlayback } from "@/hooks/usePlayback";
import { usePlaybackState } from "@/store/playerStore";
import { COLORS } from "@/config/theme";

// Keep splash screen visible until we finish init
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const { pause, resume, next, playbackState } = usePlayback();
  const state = usePlaybackState();

  useEffect(() => {
    async function init() {
      try {
        await initPlayer();
      } finally {
        SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  const handlePlayPause = () => {
    if (state.status === "playing") {
      pause();
    } else {
      resume();
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontWeight: "600",
              color: COLORS.text,
            },
            contentStyle: { backgroundColor: COLORS.background },
            animation: "fade", // lighter than slide on low-end devices
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: "Music", headerShown: false }}
          />
          <Stack.Screen
            name="player"
            options={{
              title: "Now Playing",
              headerBackTitle: "Back",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="upload"
            options={{ title: "Upload Track" }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: "Settings" }}
          />
        </Stack>

        {/* Persistent mini-player bar */}
        <PlayerBar
          playbackState={playbackState}
          onPlayPause={handlePlayPause}
          onNext={next}
        />
      </View>
    </SafeAreaProvider>
  );
}

export default RootLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
