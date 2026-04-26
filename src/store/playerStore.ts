/**
 * playerStore.ts — Global state via Zustand.
 *
 * Zustand was chosen over Redux because:
 *  1. Much smaller bundle (~1.2 KB gzip vs ~20 KB for Redux Toolkit).
 *  2. No boilerplate reducers/actions — simple for a music app.
 *  3. Works well with React.memo / useCallback since selectors only
 *     re-subscribe to the slice of state they consume.
 *
 * Performance note:
 *  - Use atomic selectors (e.g. usePlayerStore(s => s.isPlaying))
 *    to avoid unnecessary re-renders when unrelated state changes.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track, PlaybackState } from "@/utils/types";
import { LOW_END_PROFILE, NORMAL_PROFILE, type PlayerProfile } from "@/config/player";

interface PlayerStore {
  // ─── Playlist ──────────────────────────────────────────────────────────────
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;

  // ─── Playback ──────────────────────────────────────────────────────────────
  playbackState: PlaybackState;
  setPlaybackState: (state: Partial<PlaybackState>) => void;

  // ─── Queue helpers ─────────────────────────────────────────────────────────
  nextTrack: () => Track | null;
  prevTrack: () => Track | null;

  // ─── Low-end mode ──────────────────────────────────────────────────────────
  lowEndMode: boolean;
  toggleLowEndMode: () => void;
  /** Active profile derived from lowEndMode */
  profile: PlayerProfile;

  // ─── Loading state for the track list ─────────────────────────────────────
  isLoadingTracks: boolean;
  setIsLoadingTracks: (v: boolean) => void;
  tracksError: string | null;
  setTracksError: (err: string | null) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // ─── Playlist ──────────────────────────────────────────────────────────
      tracks: [],
      setTracks: (tracks) => set({ tracks }),
      currentIndex: -1,
      setCurrentIndex: (index) => set({ currentIndex: index }),

      // ─── Playback ──────────────────────────────────────────────────────────
      playbackState: {
        status: "idle",
        currentTrack: null,
        positionMs: 0,
        durationMs: 0,
        bufferedMs: 0,
        fromCache: false,
      },
      setPlaybackState: (partial) =>
        set((s) => ({ playbackState: { ...s.playbackState, ...partial } })),

      // ─── Queue helpers ─────────────────────────────────────────────────────
      nextTrack: () => {
        const { tracks, currentIndex } = get();
        if (tracks.length === 0) return null;
        const nextIdx = (currentIndex + 1) % tracks.length;
        set({ currentIndex: nextIdx });
        return tracks[nextIdx] ?? null;
      },
      prevTrack: () => {
        const { tracks, currentIndex } = get();
        if (tracks.length === 0) return null;
        const prevIdx =
          currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
        set({ currentIndex: prevIdx });
        return tracks[prevIdx] ?? null;
      },

      // ─── Low-end mode ──────────────────────────────────────────────────────
      lowEndMode: false,
      toggleLowEndMode: () =>
        set((s) => ({
          lowEndMode: !s.lowEndMode,
          profile: !s.lowEndMode ? LOW_END_PROFILE : NORMAL_PROFILE,
        })),
      profile: NORMAL_PROFILE,

      // ─── Loading ───────────────────────────────────────────────────────────
      isLoadingTracks: false,
      setIsLoadingTracks: (v) => set({ isLoadingTracks: v }),
      tracksError: null,
      setTracksError: (err) => set({ tracksError: err }),
    }),
    {
      name: "player-store-v1",
      // Persist only user preferences across app restarts
      partialize: (state) => ({
        lowEndMode: state.lowEndMode,
        profile: state.profile,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Atomic selector hooks ────────────────────────────────────────────────────
// Using separate hooks prevents whole-component re-renders from unrelated state.

export const useTracks = () => usePlayerStore((s) => s.tracks);
export const useCurrentTrack = () =>
  usePlayerStore((s) =>
    s.currentIndex >= 0 ? s.tracks[s.currentIndex] ?? null : null
  );
export const usePlaybackState = () => usePlayerStore((s) => s.playbackState);
export const useLowEndMode = () => usePlayerStore((s) => s.lowEndMode);
export const useProfile = () => usePlayerStore((s) => s.profile);
export const useIsLoadingTracks = () =>
  usePlayerStore((s) => s.isLoadingTracks);
export const useTracksError = () => usePlayerStore((s) => s.tracksError);
