/**
 * types.ts — Shared TypeScript types for the music player app.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  /** Duration in seconds */
  duration: number;
  /** Cover art URL — may be undefined for tracks without art */
  coverUrl?: string;
  /** Streaming URL (full quality) */
  streamUrl: string;
  /** Optional lower-bitrate variant URL for low-end mode */
  streamUrlLow?: string;
  /** File size in bytes — used for Range request calculations */
  fileSizeBytes?: number;
  /** Indicates whether the server supports Range requests */
  supportsRange?: boolean;
  album?: string;
  year?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: string;
}

export interface PlaybackState {
  status: "idle" | "loading" | "playing" | "paused" | "stopped" | "error";
  currentTrack: Track | null;
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
  /** Whether the current track is served from local cache */
  fromCache: boolean;
  error?: string;
}

export interface CacheEntry {
  trackId: string;
  filePath: string;
  fileSizeBytes: number;
  lastAccessedAt: number; // Unix ms
}

export interface UploadTokenResponse {
  /** Short-lived upload ID returned by the backend */
  uploadId: string;
  /** Pre-authorized upload URL */
  uploadUrl: string;
  /** Token expiry in Unix ms */
  expiresAt: number;
}

export interface UploadProgress {
  uploadId: string;
  bytesUploaded: number;
  bytesTotal: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}
