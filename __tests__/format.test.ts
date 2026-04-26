/**
 * Unit tests for format utilities.
 */

import { formatDuration, formatBytes, clamp, truncate } from "@/utils/format";

describe("formatDuration", () => {
  it("returns 0:00 for 0 seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats seconds only (< 1 minute)", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(3 * 60 + 7)).toBe("3:07");
  });

  it("formats hours correctly", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("handles negative / NaN gracefully", () => {
    expect(formatDuration(-1)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(Infinity)).toBe("0:00");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("clamp", () => {
  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("passes through values within range", () => {
    expect(clamp(7, 0, 10)).toBe(7);
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("hello world", 6)).toBe("hello…");
  });

  it("does not truncate short strings", () => {
    expect(truncate("hi", 10)).toBe("hi");
  });
});
