/**
 * usePlayback.ts — React hook that bridges the Zustand store and streamPlayer module.
 *
 * Responsibilities:
 *  1. Translates store actions (play, pause, seek, next, prev) into streamPlayer calls.
 *  2. Converts AVPlaybackStatus events into store state updates.
 *  3. Manages auto-advance to the next track on completion.
 *  4. Triggers background prefetch for the next track (respects maxPrefetch).
 *
 * Performance notes:
 *  - All callback functions are memoized with useCallback.
 *  - handleNext is stored in a ref to avoid circular dependency with handleStatusUpdate.
 *  - streamPlayer uses module-level state so this hook can be mounted at root.
 */

import { useCallback, useEffect, useRef } from "react";
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import {
  playTrack,
  pausePlayer,
  resumePlayer,
  seekTo,
  unloadPlayer,
  prefetchTrack,
  cancelPrefetch,
} from "@/modules/streamPlayer";
import {
  usePlayerStore,
  usePlaybackState,
  useProfile,
  useLowEndMode,
} from "@/store/playerStore";
import type { Track } from "@/utils/types";

function isLoaded(status: AVPlaybackStatus): status is AVPlaybackStatusSuccess {
  return status.isLoaded;
}

export function usePlayback() {
  const { setPlaybackState, nextTrack, tracks, setCurrentIndex } =
    usePlayerStore();
  const playbackState = usePlaybackState();
  const profile = useProfile();
  const lowEndMode = useLowEndMode();

  // Track the ID of the next prefetched track so we can cancel if needed
  const prefetchedTrackId = useRef<string | null>(null);

  // Store handleNext in a ref to avoid circular deps in handleStatusUpdate
  const handleNextRef = useRef<() => Promise<void>>(async () => {});

  // ─── Error handler ──────────────────────────────────────────────────────────
  const handleError = useCallback(
    (error: string) => {
      setPlaybackState({ status: "error", error });
    },
    [setPlaybackState]
  );

  // ─── Status handler ─────────────────────────────────────────────────────────
  const handleStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!isLoaded(status)) {
        if (!status.isLoaded && status.error) {
          handleError(status.error);
        }
        return;
      }

      const positionMs = status.positionMillis ?? 0;
      const durationMs = status.durationMillis ?? 0;
      const bufferedMs = status.playableDurationMillis ?? 0;

      setPlaybackState({
        positionMs,
        durationMs,
        bufferedMs,
        status: status.isPlaying
          ? "playing"
          : status.isBuffering
          ? "loading"
          : "paused",
      });

      // Auto-advance when track ends — use ref to avoid stale closure
      if (status.didJustFinish && !status.isLooping) {
        handleNextRef.current().catch(() => {});
      }
    },
    [setPlaybackState, handleError]
  );

  // ─── Play ───────────────────────────────────────────────────────────────────
  const handlePlay = useCallback(
    async (track: Track, index: number) => {
      setCurrentIndex(index);
      setPlaybackState({ status: "loading", currentTrack: track });

      // Cancel stale prefetch for a different track
      if (prefetchedTrackId.current && prefetchedTrackId.current !== track.id) {
        await cancelPrefetch(prefetchedTrackId.current);
        prefetchedTrackId.current = null;
      }

      await playTrack(
        track,
        lowEndMode,
        { onStatusUpdate: handleStatusUpdate, onError: handleError },
        profile.cacheLimitBytes
      );

      // Prefetch next track in background if allowed
      const currentTracks = usePlayerStore.getState().tracks;
      const currentIdx = usePlayerStore.getState().currentIndex;
      const nextIdx = (currentIdx + 1) % currentTracks.length;
      const nextTrk = currentTracks[nextIdx];
      if (nextTrk && profile.maxPrefetch >= 1 && nextTrk.id !== track.id) {
        prefetchedTrackId.current = nextTrk.id;
        prefetchTrack(nextTrk, lowEndMode, profile.cacheLimitBytes).catch(
          () => {}
        );
      }
    },
    [
      setCurrentIndex,
      setPlaybackState,
      lowEndMode,
      handleStatusUpdate,
      handleError,
      profile,
    ]
  );

  // ─── Pause / Resume ─────────────────────────────────────────────────────────
  const handlePause = useCallback(async () => {
    await pausePlayer();
    setPlaybackState({ status: "paused" });
  }, [setPlaybackState]);

  const handleResume = useCallback(async () => {
    await resumePlayer();
    setPlaybackState({ status: "playing" });
  }, [setPlaybackState]);

  // ─── Seek ───────────────────────────────────────────────────────────────────
  const handleSeek = useCallback(async (positionMs: number) => {
    await seekTo(positionMs);
  }, []);

  // ─── Next / Prev ────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    const track = nextTrack();
    const newIdx = usePlayerStore.getState().currentIndex;
    if (track) await handlePlay(track, newIdx);
  }, [nextTrack, handlePlay]);

  const handlePrev = useCallback(async () => {
    const { prevTrack } = usePlayerStore.getState();
    const track = prevTrack();
    const newIdx = usePlayerStore.getState().currentIndex;
    if (track) await handlePlay(track, newIdx);
  }, [handlePlay]);

  // Keep the next ref updated
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unloadPlayer().catch(() => {});
    };
  }, []);

  return {
    playbackState,
    play: handlePlay,
    pause: handlePause,
    resume: handleResume,
    seek: handleSeek,
    next: handleNext,
    prev: handlePrev,
  };
}
