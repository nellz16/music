/**
 * app/upload.tsx — Upload screen.
 *
 * Flow:
 *  1. User taps "Select File" — expo-document-picker opens.
 *  2. App requests a short-lived upload token from the backend.
 *  3. App streams the file to the signed URL using uploadTrack().
 *  4. Progress shown via a simple progress bar.
 *
 * NOTE: expo-document-picker is listed as a peer dependency.
 * Add it with: expo install expo-document-picker
 * It is commented out here so the app compiles without it if not installed.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { uploadTrack } from "@/modules/uploadHelper";
import type { UploadProgress } from "@/utils/types";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "@/config/theme";
import { formatBytes } from "@/utils/format";

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export default function UploadScreen() {
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ─── File picker ───────────────────────────────────────────────────────────
  // Commented out until expo-document-picker is installed.
  // Uncomment after running: expo install expo-document-picker
  const handlePickFile = useCallback(async () => {
    Alert.alert(
      "Document Picker",
      "Install expo-document-picker and uncomment the picker code in app/upload.tsx to enable file selection.\n\nexpo install expo-document-picker",
      [{ text: "OK" }]
    );

    // ── Uncomment below after installing expo-document-picker ────────────────
    // import * as DocumentPicker from 'expo-document-picker';
    // const result = await DocumentPicker.getDocumentAsync({
    //   type: ['audio/*'],
    //   copyToCacheDirectory: true, // copies to app cache — never keeps in memory
    // });
    // if (result.canceled) return;
    // const asset = result.assets[0];
    // setPickedFile({
    //   uri: asset.uri,
    //   name: asset.name,
    //   mimeType: asset.mimeType ?? 'audio/mpeg',
    //   size: asset.size ?? 0,
    // });
    // ─────────────────────────────────────────────────────────────────────────
  }, []);

  // ─── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!pickedFile) return;
    setIsUploading(true);
    try {
      await uploadTrack(
        pickedFile.uri,
        pickedFile.name,
        pickedFile.mimeType,
        pickedFile.size,
        (prog) => setProgress(prog)
      );
      Alert.alert("Success", "Track uploaded successfully.");
      setPickedFile(null);
      setProgress(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Upload Failed", msg);
    } finally {
      setIsUploading(false);
    }
  }, [pickedFile]);

  const progressRatio =
    progress && progress.bytesTotal > 0
      ? progress.bytesUploaded / progress.bytesTotal
      : 0;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.heading}>Upload Track</Text>
        <Text style={styles.hint}>
          Select an audio file (MP3, M4A, OGG, FLAC) to upload to your library.
        </Text>

        {/* File selection */}
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={handlePickFile}
          disabled={isUploading}
          accessibilityLabel="Select audio file"
          accessibilityRole="button"
        >
          <Text style={styles.pickBtnText}>
            {pickedFile ? "Change File" : "Select File"}
          </Text>
        </TouchableOpacity>

        {/* Picked file info */}
        {pickedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {pickedFile.name}
            </Text>
            <Text style={styles.fileSize}>{formatBytes(pickedFile.size)}</Text>
          </View>
        )}

        {/* Progress */}
        {progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressRatio * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress.status === "uploading"
                ? `Uploading… ${Math.round(progressRatio * 100)}%`
                : progress.status === "done"
                ? "Done"
                : progress.status === "error"
                ? `Error: ${progress.error}`
                : "Preparing…"}
            </Text>
          </View>
        )}

        {/* Upload button */}
        <TouchableOpacity
          style={[styles.uploadBtn, (!pickedFile || isUploading) && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!pickedFile || isUploading}
          accessibilityLabel="Upload selected file"
          accessibilityRole="button"
        >
          {isUploading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.uploadBtnText}>Upload</Text>
          )}
        </TouchableOpacity>

        {/* API note */}
        <View style={styles.apiNote}>
          <Text style={styles.apiNoteText}>
            Backend endpoint: POST {"\n"}
            EXPO_PUBLIC_API_URL/upload/token{"\n"}
            See uploadHelper.ts for the required request shape.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  heading: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    color: COLORS.text,
  },
  hint: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  pickBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
  },
  pickBtnText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  fileInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  fileName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.fontWeightSemibold,
  },
  fileSize: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.small,
  },
  progressSection: {
    gap: SPACING.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.progressTrack,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.progress,
  },
  progressText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
  },
  uploadBtnDisabled: {
    opacity: 0.4,
  },
  uploadBtnText: {
    color: "#000",
    fontWeight: TYPOGRAPHY.fontWeightBold,
    fontSize: TYPOGRAPHY.base,
  },
  apiNote: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  apiNoteText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontFamily: "monospace",
  },
});
