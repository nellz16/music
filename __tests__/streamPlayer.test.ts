/**
 * Unit tests for streamPlayer utility functions.
 * The expo-av Sound module is mocked to avoid native bridging in test env.
 */

import { estimateByteOffset, probeRangeSupport } from "@/modules/streamPlayer";

// ─── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("estimateByteOffset", () => {
  it("returns 0 for position 0", () => {
    expect(estimateByteOffset(0, 200_000, 5_000_000)).toBe(0);
  });

  it("returns approximate midpoint for 50% position", () => {
    const offset = estimateByteOffset(100_000, 200_000, 5_000_000);
    // Should be near 2,500,000 aligned to SEEK_CHUNK_BYTES (32768)
    expect(offset).toBeGreaterThan(2_400_000);
    expect(offset).toBeLessThanOrEqual(2_500_000 + 32768);
  });

  it("returns 0 for zero duration", () => {
    expect(estimateByteOffset(5000, 0, 1_000_000)).toBe(0);
  });

  it("returns 0 for zero file size", () => {
    expect(estimateByteOffset(5000, 200_000, 0)).toBe(0);
  });
});

describe("probeRangeSupport", () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it("returns true when Accept-Ranges: bytes is present", async () => {
    mockFetch.mockResolvedValueOnce({
      headers: { get: (name: string) => (name === "Accept-Ranges" ? "bytes" : null) },
    });
    const result = await probeRangeSupport("https://example.com/audio.mp3");
    expect(result).toBe(true);
  });

  it("returns false when Accept-Ranges header is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      headers: { get: () => null },
    });
    const result = await probeRangeSupport("https://example.com/audio.mp3");
    expect(result).toBe(false);
  });

  it("returns false on fetch error (graceful fallback)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await probeRangeSupport("https://example.com/audio.mp3");
    expect(result).toBe(false);
  });
});
