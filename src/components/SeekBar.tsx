/**
 * SeekBar.tsx — Seekable progress bar for the full player screen.
 *
 * Uses PanResponder for gesture handling instead of a Slider component
 * to avoid a heavier dependency on the low-end device.
 *
 * Implementation note:
 *  - We snapshot positionMs on touch start and calculate delta,
 *    then call onSeek on touch end to avoid spamming setPositionAsync.
 *  - The visual fill updates during drag without triggering playback seeks.
 */

import React, { memo, useRef, useCallback } from "react";
import {
  View,
  PanResponder,
  StyleSheet,
  Text,
  LayoutChangeEvent,
} from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "@/config/theme";
import { formatDuration } from "@/utils/format";
import { clamp } from "@/utils/format";

interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
  onSeek: (positionMs: number) => void;
}

const BAR_HEIGHT = 4;
const THUMB_SIZE = 14;

const SeekBar = memo(function SeekBar({
  positionMs,
  durationMs,
  bufferedMs,
  onSeek,
}: SeekBarProps) {
  const barWidth = useRef(0);
  const isDragging = useRef(false);
  const dragPosition = useRef(positionMs);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        isDragging.current = true;
        const x = e.nativeEvent.locationX;
        if (barWidth.current > 0 && durationMs > 0) {
          dragPosition.current = clamp((x / barWidth.current) * durationMs, 0, durationMs);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isDragging.current || barWidth.current <= 0 || durationMs <= 0) return;
        const ratio = clamp(gestureState.moveX / barWidth.current, 0, 1);
        dragPosition.current = ratio * durationMs;
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        onSeek(Math.round(dragPosition.current));
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  const displayPosition = isDragging.current ? dragPosition.current : positionMs;
  const fillRatio = durationMs > 0 ? clamp(displayPosition / durationMs, 0, 1) : 0;
  const bufferRatio = durationMs > 0 ? clamp(bufferedMs / durationMs, 0, 1) : 0;

  return (
    <View style={styles.wrapper}>
      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatDuration(displayPosition / 1000)}</Text>
        <Text style={styles.time}>{formatDuration(durationMs / 1000)}</Text>
      </View>

      {/* Bar + thumb */}
      <View
        style={styles.barContainer}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        accessible={true}
        accessibilityLabel={`Seek bar, position ${formatDuration(displayPosition / 1000)} of ${formatDuration(durationMs / 1000)}`}
        accessibilityRole="adjustable"
      >
        {/* Track */}
        <View style={styles.track} />
        {/* Buffer */}
        <View style={[styles.buffer, { width: `${bufferRatio * 100}%` }]} />
        {/* Fill */}
        <View style={[styles.fill, { width: `${fillRatio * 100}%` }]} />
        {/* Thumb */}
        <View style={[styles.thumb, { left: `${fillRatio * 100}%` }]} />
      </View>
    </View>
  );
});

export default SeekBar;

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  barContainer: {
    height: THUMB_SIZE + SPACING.sm * 2,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: COLORS.progressTrack,
  },
  buffer: {
    position: "absolute",
    left: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: COLORS.textDisabled,
  },
  fill: {
    position: "absolute",
    left: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: COLORS.progress,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.primary,
    marginLeft: -(THUMB_SIZE / 2),
    top: "50%",
    marginTop: -(THUMB_SIZE / 2),
  },
});
