/**
 * TrackRow.tsx — Single row in the track FlatList.
 *
 * Memoized with React.memo to prevent re-renders when other tracks change.
 * Uses a fixed height (TRACK_ROW_HEIGHT) so FlatList can use getItemLayout
 * for O(1) scroll position calculation — critical for long lists on low-end devices.
 *
 * Image loading uses expo-image (lazy loading, disk cache, placeholder blur).
 * On low-end mode, images can be omitted to save memory.
 */

import React, { memo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import type { Track } from "@/utils/types";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  TRACK_ROW_HEIGHT,
} from "@/config/theme";
import { formatDuration } from "@/utils/format";

interface TrackRowProps {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  lowEndMode: boolean;
  onPress: (track: Track, index: number) => void;
  /** Whether this track is locally cached */
  isCached?: boolean;
}

const COVER_SIZE = 48;
const PLACEHOLDER = require("@/assets/placeholder.png");

const TrackRow = memo(function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  lowEndMode,
  onPress,
  isCached = false,
}: TrackRowProps) {
  const handlePress = useCallback(() => {
    onPress(track, index);
  }, [onPress, track, index]);

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.rowActive]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Play ${track.title} by ${track.artist}`}
      accessibilityRole="button"
    >
      {/* Cover art — skipped in low-end mode to save memory */}
      {!lowEndMode ? (
        <Image
          source={track.coverUrl ? { uri: track.coverUrl } : PLACEHOLDER}
          placeholder={PLACEHOLDER}
          contentFit="cover"
          transition={lowEndMode ? 0 : 200}
          style={styles.cover}
          recyclingKey={track.id}
          // expo-image will use the system disk cache; avoids re-decoding
          cachePolicy="disk"
        />
      ) : (
        <View style={styles.coverPlaceholder} />
      )}

      {/* Track info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, isActive && styles.titleActive]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {track.artist}
        </Text>
      </View>

      {/* Right side: duration + indicators */}
      <View style={styles.right}>
        {isCached && <View style={styles.cachedDot} />}
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        {isActive && isPlaying && (
          <PlayingIndicator lowEnd={lowEndMode} />
        )}
      </View>
    </TouchableOpacity>
  );
});

export default TrackRow;

// ─── Playing indicator ────────────────────────────────────────────────────────
// Simple 3-bar static indicator for low-end; animated for normal mode.
// Using React Native's Animated API is intentionally avoided here to minimize
// JS thread work on low-end devices. The low-end version is just colored bars.

import { Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";

const PlayingIndicator = memo(function PlayingIndicator({
  lowEnd,
}: {
  lowEnd: boolean;
}) {
  if (lowEnd) {
    return (
      <View style={styles.indicatorContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.indicatorBar, { height: 4 + i * 4 }]} />
        ))}
      </View>
    );
  }
  return <AnimatedBars />;
});

const AnimatedBars = memo(function AnimatedBars() {
  const anims = [useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.7)).current, useRef(new Animated.Value(0.55)).current];

  useEffect(() => {
    const createLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );

    const loops = anims.map((a, i) => createLoop(a, i * 130));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.indicatorContainer}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.indicatorBar,
            { transform: [{ scaleY: anim }] },
          ]}
        />
      ))}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: TRACK_ROW_HEIGHT,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  rowActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS.sm,
    flexShrink: 0,
  },
  coverPlaceholder: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
    minWidth: 0, // allow text truncation
  },
  title: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: COLORS.text,
    lineHeight: 20,
  },
  titleActive: {
    color: COLORS.primary,
  },
  artist: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  duration: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  cachedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 16,
    gap: 2,
  },
  indicatorBar: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    transformOrigin: "bottom",
  },
});
