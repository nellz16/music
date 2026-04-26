/**
 * Unit tests for the Zustand playerStore.
 */

import { act, renderHook } from "@testing-library/react-native";
import { usePlayerStore } from "@/store/playerStore";
import { NORMAL_PROFILE, LOW_END_PROFILE } from "@/config/player";

// Reset store state between tests
beforeEach(() => {
  usePlayerStore.setState({
    tracks: [],
    currentIndex: -1,
    lowEndMode: false,
    profile: NORMAL_PROFILE,
    isLoadingTracks: false,
    tracksError: null,
    playbackState: {
      status: "idle",
      currentTrack: null,
      positionMs: 0,
      durationMs: 0,
      bufferedMs: 0,
      fromCache: false,
    },
  });
});

const MOCK_TRACKS = [
  { id: "1", title: "Track 1", artist: "Artist", duration: 240, streamUrl: "https://example.com/1.mp3" },
  { id: "2", title: "Track 2", artist: "Artist", duration: 180, streamUrl: "https://example.com/2.mp3" },
  { id: "3", title: "Track 3", artist: "Artist", duration: 300, streamUrl: "https://example.com/3.mp3" },
];

describe("playerStore — tracks", () => {
  it("sets tracks", () => {
    const { result } = renderHook(() => usePlayerStore());
    act(() => { result.current.setTracks(MOCK_TRACKS as never); });
    expect(result.current.tracks).toHaveLength(3);
  });

  it("sets current index", () => {
    const { result } = renderHook(() => usePlayerStore());
    act(() => {
      result.current.setTracks(MOCK_TRACKS as never);
      result.current.setCurrentIndex(1);
    });
    expect(result.current.currentIndex).toBe(1);
  });
});

describe("playerStore — queue navigation", () => {
  it("nextTrack advances index and wraps around", () => {
    const { result } = renderHook(() => usePlayerStore());
    act(() => {
      result.current.setTracks(MOCK_TRACKS as never);
      result.current.setCurrentIndex(2);
    });
    let track;
    act(() => { track = result.current.nextTrack(); });
    expect(result.current.currentIndex).toBe(0);
    expect(track).toBeDefined();
  });

  it("prevTrack goes backwards and wraps to end", () => {
    const { result } = renderHook(() => usePlayerStore());
    act(() => {
      result.current.setTracks(MOCK_TRACKS as never);
      result.current.setCurrentIndex(0);
    });
    let track;
    act(() => { track = result.current.prevTrack(); });
    expect(result.current.currentIndex).toBe(2);
    expect(track).toBeDefined();
  });
});

describe("playerStore — low-end mode", () => {
  it("toggles low-end mode and switches profile", () => {
    const { result } = renderHook(() => usePlayerStore());
    expect(result.current.lowEndMode).toBe(false);
    expect(result.current.profile).toEqual(NORMAL_PROFILE);

    act(() => { result.current.toggleLowEndMode(); });
    expect(result.current.lowEndMode).toBe(true);
    expect(result.current.profile).toEqual(LOW_END_PROFILE);

    act(() => { result.current.toggleLowEndMode(); });
    expect(result.current.lowEndMode).toBe(false);
    expect(result.current.profile).toEqual(NORMAL_PROFILE);
  });
});

describe("playerStore — playback state", () => {
  it("updates partial playback state", () => {
    const { result } = renderHook(() => usePlayerStore());
    act(() => {
      result.current.setPlaybackState({ status: "playing", positionMs: 5000 });
    });
    expect(result.current.playbackState.status).toBe("playing");
    expect(result.current.playbackState.positionMs).toBe(5000);
    // Other fields should remain unchanged
    expect(result.current.playbackState.durationMs).toBe(0);
  });
});
