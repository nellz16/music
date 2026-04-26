/**
 * useTracks.ts — Hook to fetch the track list from the API.
 *
 * Fetches once on mount; exposes a manual refresh function.
 * Error and loading state are stored in the global player store
 * so the mini-player bar can react to "no tracks" state.
 */

import { useEffect, useCallback } from "react";
import { ENDPOINTS } from "@/config/env";
import { usePlayerStore } from "@/store/playerStore";
import type { Track } from "@/utils/types";

export function useTracks() {
  const { setTracks, setIsLoadingTracks, setTracksError, tracks } =
    usePlayerStore();

  const fetchTracks = useCallback(async () => {
    setIsLoadingTracks(true);
    setTracksError(null);
    try {
      const res = await fetch(ENDPOINTS.TRACKS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Track[];
      setTracks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load tracks";
      setTracksError(msg);
    } finally {
      setIsLoadingTracks(false);
    }
  }, [setTracks, setIsLoadingTracks, setTracksError]);

  useEffect(() => {
    if (tracks.length === 0) {
      fetchTracks();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { fetchTracks };
}
