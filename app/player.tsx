/**
 * app/player.tsx — Full-screen player.
 *
 * Shows: large cover art, title/artist, seek bar with Range-based seeking,
 * play/pause/prev/next controls, and playback quality info.
 *
 * In low-end mode: cover art is smaller, no shadows, no blur effects.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { usePlayback } from "@/hooks/usePlayback";
import SeekBar from "@/components/SeekBar";
import {
  useLowEndMode,
  useProfile,
  usePlayerStore,
} from "@/store/playerStore";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "@/config/theme";
import { formatDuration } from "@/utils/format";

const PLACEHOLDER = require("@/assets/placeholder.png");

export default function PlayerScreen() {
  const { playbackState, pause, resume, seek, next, prev } = usePlayback();
  const lowEndMode = useLowEndMode();
  const profile = useProfile();
  const currentTrack = playbackState.currentTrack;

  const { status, positionMs, durationMs, bufferedMs, fromCache } =
    playbackState;
  const isPlaying = status === "playing";
  const isLoading = status === "loading";

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const handleSeek = useCallback(
    (ms: number) => {
      seek(ms);
    },
    [seek]
  );

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.noTrackText}>No track selected</Text>
      </SafeAreaView>
    );
  }

  const coverSize = lowEndMode ? 200 : 280;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // player doesn't need scroll — disable for perf
      >
        {/* Cover art */}
        <View style={[styles.coverWrapper, lowEndMode && styles.coverWrapperLowEnd]}>
          {!lowEndMode ? (
            <Image
              source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : PLACEHOLDER}
              placeholder={PLACEHOLDER}
              contentFit="cover"
              style={[styles.cover, { width: coverSize, height: coverSize }]}
              cachePolicy="disk"
              recyclingKey={currentTrack.id}
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.coverPlaceholder,
                { width: coverSize, height: coverSize },
              ]}
            />
          )}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          )}
        </View>

        {/* Track metadata */}
        <View style={styles.metadata}>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist}>{currentTrack.artist}</Text>
          {currentTrack.album && (
            <Text style={styles.album}>{currentTrack.album}</Text>
          )}
        </View>

        {/* Status badges */}
        <View style={styles.badges}>
          {fromCache && (
            <View style={[styles.badge, styles.badgeCache]}>
              <Text style={styles.badgeText}>CACHED</Text>
            </View>
          )}
          <View style={[styles.badge, styles.badgeQuality]}>
            <Text style={styles.badgeText}>
              {lowEndMode ? `${profile.targetBitrate}kbps` : "HQ"}
            </Text>
          </View>
          {playbackState.error && (
            <View style={[styles.badge, styles.badgeError]}>
              <Text style={styles.badgeText}>ERROR</Text>
            </View>
          )}
        </View>

        {/* Seek bar */}
        <View style={styles.seekBarWrapper}>
          <SeekBar
            positionMs={positionMs}
            durationMs={durationMs}
            bufferedMs={bufferedMs}
            onSeek={handleSeek}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={prev}
            style={styles.controlBtn}
            hitSlop={16}
            accessibilityLabel="Previous track"
            accessibilityRole="button"
          >
            <Text style={styles.controlIcon}>⏮</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={[styles.controlBtn, styles.playBtn]}
            hitSlop={8}
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.playIcon}>{isPlaying ? "⏸" : "▶"}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={next}
            style={styles.controlBtn}
            hitSlop={16}
            accessibilityLabel="Next track"
            accessibilityRole="button"
          >
            <Text style={styles.controlIcon}>⏭</Text>
          </Pressable>
        </View>

        {/* Error message */}
        {playbackState.error && (
          <Text style={styles.errorText} numberOfLines={2}>
            {playbackState.error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  noTrackText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.base,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  coverWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: RADIUS.md,
  },
  coverWrapperLowEnd: {
    shadowColor: "transparent",
    elevation: 0,
  },
  cover: {
    borderRadius: RADIUS.md,
  },
  coverPlaceholder: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADIUS.md,
  },
  metadata: {
    alignItems: "center",
    gap: SPACING.xs,
    width: "100%",
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.text,
    textAlign: "center",
  },
  artist: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  album: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textDisabled,
    textAlign: "center",
  },
  badges: {
    flexDirection: "row",
    gap: SPACING.xs,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeCache: {
    backgroundColor: COLORS.success + "33",
    borderWidth: 1,
    borderColor: COLORS.success + "66",
  },
  badgeQuality: {
    backgroundColor: COLORS.primary + "22",
    borderWidth: 1,
    borderColor: COLORS.primary + "55",
  },
  badgeError: {
    backgroundColor: COLORS.error + "22",
    borderWidth: 1,
    borderColor: COLORS.error + "55",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  seekBarWrapper: {
    width: "100%",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xl,
  },
  controlBtn: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  controlIcon: {
    fontSize: 28,
    color: COLORS.text,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
  },
  playIcon: {
    fontSize: 28,
    color: "#000",
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.small,
    textAlign: "center",
    paddingHorizontal: SPACING.md,
  },
});
