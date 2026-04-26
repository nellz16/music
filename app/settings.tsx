/**
 * app/settings.tsx — Settings screen with Low-End Mode toggle and cache info.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLowEndMode, usePlayerStore, useProfile } from "@/store/playerStore";
import { clearCache, getCacheStats } from "@/modules/audioCache";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "@/config/theme";
import { formatBytes } from "@/utils/format";

export default function SettingsScreen() {
  const lowEndMode = useLowEndMode();
  const { toggleLowEndMode } = usePlayerStore();
  const profile = useProfile();

  const [cacheStats, setCacheStats] = useState<{
    totalBytes: number;
    entryCount: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      "Clear Cache",
      "This will remove all offline-cached tracks. They will re-download on next play.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            await clearCache();
            await loadCacheStats();
            setIsClearing(false);
          },
        },
      ]
    );
  }, [loadCacheStats]);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Low-end mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Low-End Mode</Text>
              <Text style={styles.rowDesc}>
                Reduces animations, lowers audio bitrate to {profile.targetBitrate} kbps,
                limits cache to {formatBytes(profile.cacheLimitBytes)}, and
                disables waveform visualizers.
              </Text>
            </View>
            <Switch
              value={lowEndMode}
              onValueChange={toggleLowEndMode}
              trackColor={{ false: COLORS.border, true: COLORS.primary + "88" }}
              thumbColor={lowEndMode ? COLORS.primary : COLORS.textMuted}
              accessibilityLabel="Toggle low-end mode"
            />
          </View>
        </View>

        {/* Active profile display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Profile</Text>
          <View style={styles.profileGrid}>
            <ProfileStat label="Bitrate" value={`${profile.targetBitrate} kbps`} />
            <ProfileStat label="List window" value={`${profile.listWindowSize}x`} />
            <ProfileStat label="Cache limit" value={formatBytes(profile.cacheLimitBytes)} />
            <ProfileStat label="Prebuffer" value={`${profile.prebufferMs}ms`} />
            <ProfileStat label="Animations" value={profile.listAnimations ? "On" : "Off"} />
            <ProfileStat label="Waveform" value={profile.waveformEnabled ? "On" : "Off"} />
            <ProfileStat label="Mono mix" value={profile.monoDownmix ? "On" : "Off"} />
            <ProfileStat label="Max prefetch" value={String(profile.maxPrefetch)} />
          </View>
        </View>

        {/* Cache */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Cache (LRU)</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Cached tracks</Text>
              <Text style={styles.rowDesc}>
                {cacheStats
                  ? `${cacheStats.entryCount} files · ${formatBytes(cacheStats.totalBytes)}`
                  : "Loading…"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.clearBtn, isClearing && styles.clearBtnDisabled]}
              onPress={handleClearCache}
              disabled={isClearing}
              accessibilityLabel="Clear offline cache"
              accessibilityRole="button"
            >
              <Text style={styles.clearBtnText}>
                {isClearing ? "Clearing…" : "Clear"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.about}>
            Expo Music Player — optimized for low-end Android devices.{"\n"}
            Hermes engine · ProGuard · LRU streaming cache{"\n"}
            expo-av range-based seeking
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ProfileStat = React.memo(function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
    color: COLORS.text,
  },
  rowDesc: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  clearBtn: {
    backgroundColor: COLORS.error + "22",
    borderWidth: 1,
    borderColor: COLORS.error + "55",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  clearBtnDisabled: {
    opacity: 0.5,
  },
  clearBtnText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  profileGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statCell: {
    width: "22%",
    alignItems: "center",
    gap: 2,
    paddingVertical: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  about: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
