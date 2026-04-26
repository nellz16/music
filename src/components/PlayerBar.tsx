/**
 * PlayerBar.tsx — Persistent mini-player bar at the bottom of every screen.
 *
 * Design choices:
 *  - TouchableOpacity wraps the entire bar to navigate to the full player.
 *  - Uses a thin progress bar (no waveform) to stay lightweight.
 *  - No animations in low-end mode.
 *  - Memoized with React.memo; only re-renders when playback state changes.
 */

import React, { memo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  PLAYER_BAR_HEIGHT,
} from "@/config/theme";
import { formatDuration } from "@/utils/format";
import type { PlaybackState } from "@/utils/types";
import { useLowEndMode } from "@/store/playerStore";

interface PlayerBarProps {
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onNext: () => void;
}

const COVER_SIZE = 44;
const PLACEHOLDER = require("@/assets/placeholder.png");

const PlayerBar = memo(function PlayerBar({
  playbackState,
  onPlayPause,
  onNext,
}: PlayerBarProps) {
  const lowEndMode = useLowEndMode();
  const { currentTrack, status, positionMs, durationMs } = playbackState;

  if (!currentTrack || status === "idle" || status === "stopped") {
    return null;
  }

  const isPlaying = status === "playing";
  const progressRatio = durationMs > 0 ? positionMs / durationMs : 0;

  const handleBarPress = useCallback(() => {
    router.push("/player");
  }, []);

  return (
    <View style={styles.container}>
      {/* Thin progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.inner}
        onPress={handleBarPress}
        activeOpacity={0.85}
        accessibilityLabel="Open full player"
        accessibilityRole="button"
      >
        {/* Cover */}
        {!lowEndMode ? (
          <Image
            source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : PLACEHOLDER}
            placeholder={PLACEHOLDER}
            contentFit="cover"
            style={styles.cover}
            cachePolicy="disk"
            recyclingKey={currentTrack.id}
          />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}

        {/* Track info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
            {currentTrack.artist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={onPlayPause}
            style={styles.controlBtn}
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Text style={styles.controlIcon}>{isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable
            onPress={onNext}
            style={styles.controlBtn}
            accessibilityLabel="Next track"
            accessibilityRole="button"
            hitSlop={12}
          >
            <Text style={styles.controlIcon}>⏭</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default PlayerBar;

const styles = StyleSheet.create({
  container: {
    height: PLAYER_BAR_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  progressTrack: {
    height: 2,
    backgroundColor: COLORS.progressTrack,
    width: "100%",
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.progress,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS.sm,
  },
  coverPlaceholder: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: COLORS.text,
  },
  artist: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  controlBtn: {
    padding: SPACING.xs,
  },
  controlIcon: {
    fontSize: 20,
    color: COLORS.text,
  },
});
