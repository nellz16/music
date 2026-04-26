/**
 * player.ts — Player and performance configuration constants.
 *
 * Two profiles:
 *   NORMAL_PROFILE  — reasonable defaults for mid-range devices
 *   LOW_END_PROFILE — aggressive settings for "kentang" / potato phones
 *
 * The active profile is chosen in the store (src/store/playerStore.ts)
 * based on the lowEndMode toggle or detected available heap.
 */

export interface PlayerProfile {
  /** Audio prebuffer duration in milliseconds */
  prebufferMs: number;
  /** FlatList windowSize — how many viewport-heights to render outside view */
  listWindowSize: number;
  /** FlatList initialNumToRender */
  listInitialRender: number;
  /** FlatList maxToRenderPerBatch */
  listMaxBatch: number;
  /** FlatList updateCellsBatchingPeriod in ms */
  listBatchPeriod: number;
  /** Enable list item entrance animations */
  listAnimations: boolean;
  /** Target audio bitrate (kbps) — request lower-quality variant if available */
  targetBitrate: number;
  /** Byte range chunk size for streaming requests (bytes) */
  chunkSize: number;
  /** Max concurrent prefetch requests */
  maxPrefetch: number;
  /** Offline cache max size in bytes (LRU eviction) */
  cacheLimitBytes: number;
  /** Mono downmix — reduces CPU for audio decode on very weak SoCs */
  monoDownmix: boolean;
  /** Show waveform visualizer */
  waveformEnabled: boolean;
}

/** Standard profile for mid-range and decent devices */
export const NORMAL_PROFILE: PlayerProfile = {
  prebufferMs: 5000,
  listWindowSize: 5,
  listInitialRender: 8,
  listMaxBatch: 5,
  listBatchPeriod: 50,
  listAnimations: true,
  targetBitrate: 128,
  chunkSize: 256 * 1024,  // 256 KB
  maxPrefetch: 2,
  cacheLimitBytes: 100 * 1024 * 1024, // 100 MB
  monoDownmix: false,
  waveformEnabled: true,
};

/** Low-end profile — conserves RAM, CPU, and battery */
export const LOW_END_PROFILE: PlayerProfile = {
  prebufferMs: 1500,
  listWindowSize: 2,        // render only 2 screen-heights outside viewport
  listInitialRender: 5,
  listMaxBatch: 2,
  listBatchPeriod: 100,
  listAnimations: false,    // no entrance / transition animations
  targetBitrate: 64,        // prefer 64 kbps variant
  chunkSize: 64 * 1024,     // 64 KB — smaller requests
  maxPrefetch: 1,           // only prefetch 1 track ahead
  cacheLimitBytes: 30 * 1024 * 1024, // 30 MB — strict cache limit
  monoDownmix: true,        // halves audio channel decode work
  waveformEnabled: false,   // no waveform computation
};

/** Seeking: minimum granularity for byte-range seeking (bytes) */
export const SEEK_CHUNK_BYTES = 32 * 1024; // 32 KB

/** How long (ms) to wait for a range request before falling back to full download */
export const RANGE_REQUEST_TIMEOUT_MS = 8000;

/** Maximum offline cache file age in milliseconds (7 days) */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Directory name inside expo-file-system cache directory */
export const CACHE_DIR_NAME = "music_cache";
