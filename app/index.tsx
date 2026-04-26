/**
 * app/index.tsx — Track list / playlist screen.
 *
 * Performance critical path:
 *  - FlatList with getItemLayout (fixed height) for O(1) scroll position.
 *  - windowSize, initialNumToRender, maxToRenderPerBatch from active profile.
 *  - removeClippedSubviews={true} — unmounts off-screen rows from the JS layer.
 *  - React.memo on TrackRow prevents re-renders from unrelated state changes.
 */

import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import TrackRow from "@/components/TrackRow";
import type { Track } from "@/utils/types";
import {
  useTracks,
  usePlayerStore,
  useIsLoadingTracks,
  useTracksError,
  useProfile,
  useLowEndMode,
} from "@/store/playerStore";
import { usePlayback } from "@/hooks/usePlayback";
import { useTracks as useFetchTracksHook } from "@/hooks/useTracks";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, TRACK_ROW_HEIGHT } from "@/config/theme";

export default function TrackListScreen() {
  const tracks = useTracks();
  const isLoading = useIsLoadingTracks();
  const tracksError = useTracksError();
  const profile = useProfile();
  const lowEndMode = useLowEndMode();
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playbackStatus = usePlayerStore((s) => s.playbackState.status);

  const { play } = usePlayback();
  const { fetchTracks } = useFetchTracksHook();

  // ─── FlatList key extractor & getItemLayout ─────────────────────────────────
  const keyExtractor = useCallback((item: Track) => item.id, []);

  // getItemLayout allows FlatList to skip measuring — O(1) scroll math
  const getItemLayout = useCallback(
    (_: Track[] | null | undefined, index: number) => ({
      length: TRACK_ROW_HEIGHT,
      offset: TRACK_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  // ─── Row press handler ───────────────────────────────────────────────────────
  const handleTrackPress = useCallback(
    (track: Track, index: number) => {
      play(track, index);
    },
    [play]
  );

  // ─── Render item (memoized factory via useCallback) ──────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <TrackRow
        track={item}
        index={index}
        isActive={index === currentIndex}
        isPlaying={index === currentIndex && playbackStatus === "playing"}
        lowEndMode={lowEndMode}
        onPress={handleTrackPress}
      />
    ),
    [currentIndex, playbackStatus, lowEndMode, handleTrackPress]
  );

  // ─── Header ─────────────────────────────────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>Library</Text>
          {tracks.length > 0 && (
            <Text style={styles.trackCount}>{tracks.length} tracks</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {lowEndMode && (
            <View style={styles.lowEndBadge}>
              <Text style={styles.lowEndBadgeText}>LOW-END</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Text style={styles.iconBtn}>⚙</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/upload")}
            hitSlop={12}
            accessibilityLabel="Upload track"
            accessibilityRole="button"
          >
            <Text style={styles.iconBtn}>⬆</Text>
          </Pressable>
        </View>
      </View>
    ),
    [tracks.length, lowEndMode]
  );

  // ─── Empty / error states ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tracks…</Text>
      </SafeAreaView>
    );
  }

  if (tracksError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{tracksError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTracks}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={tracks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        // ── Low-end optimizations ──────────────────────────────────────────────
        windowSize={profile.listWindowSize}
        initialNumToRender={profile.listInitialRender}
        maxToRenderPerBatch={profile.listMaxBatch}
        updateCellsBatchingPeriod={profile.listBatchPeriod}
        removeClippedSubviews={true}
        // ─────────────────────────────────────────────────────────────────────
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchTracks}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tracks found</Text>
            <Text style={styles.emptyHint}>
              Check your internet connection or upload tracks.
            </Text>
          </View>
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.headingLg,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.text,
  },
  trackCount: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  iconBtn: {
    fontSize: 22,
    color: COLORS.text,
    paddingHorizontal: SPACING.xs,
  },
  lowEndBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowEndBadgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: "#000",
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.base,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.base,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  retryText: {
    color: "#000",
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    fontSize: TYPOGRAPHY.base,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: SPACING.xxl,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.base,
    textAlign: "center",
  },
});
