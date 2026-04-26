/**
 * scripts/k6-network-sim.js — k6 load test script.
 *
 * Simulates poor-network conditions by testing the backend streaming API
 * with concurrent connections and slow response expectations.
 *
 * Run with:
 *   k6 run scripts/k6-network-sim.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 *
 * This test exercises:
 *  1. Track list API response time
 *  2. Audio stream HEAD request (range probe)
 *  3. Audio stream GET with Range header (seek simulation)
 *  4. Upload token endpoint
 *
 * Thresholds are intentionally generous for slow mobile networks.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

// ─── Config ────────────────────────────────────────────────────────────────────
// Replace with your actual backend URL for real testing.
// PLACEHOLDER — set via k6 env: k6 run -e API_URL=https://api.example.com ...
const API_URL = __ENV.API_URL || "https://api.example.com";
const CDN_URL = __ENV.CDN_URL || "https://cdn.example.com";

// Sample track ID for stream tests — replace with a real one from your API
const SAMPLE_TRACK_ID = __ENV.TRACK_ID || "sample-track-id";
const SAMPLE_STREAM_URL = `${CDN_URL}/audio/${SAMPLE_TRACK_ID}.mp3`;

const trackListLatency = new Trend("track_list_latency");
const streamHeadLatency = new Trend("stream_head_latency");
const streamRangeLatency = new Trend("stream_range_latency");
const uploadTokenLatency = new Trend("upload_token_latency");
const errorRate = new Rate("error_rate");

// ─── Test options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Simulate 10 concurrent mobile users on a poor 3G network
    poor_network: {
      executor: "constant-vus",
      vus: 10,
      duration: "60s",
    },
  },
  thresholds: {
    // Track list should respond within 3 seconds (slow network allowance)
    track_list_latency: ["p(95)<3000"],
    // Range HEAD probe should be fast
    stream_head_latency: ["p(95)<2000"],
    // Streaming range request: first byte within 5 seconds
    stream_range_latency: ["p(95)<5000"],
    // Upload token: within 3 seconds
    upload_token_latency: ["p(95)<3000"],
    error_rate: ["rate<0.05"], // < 5% errors
  },
};

// ─── Default test ──────────────────────────────────────────────────────────────
export default function () {
  // 1. Fetch track list
  {
    const res = http.get(`${API_URL}/tracks`, {
      headers: { Accept: "application/json" },
      timeout: "10s",
    });
    trackListLatency.add(res.timings.duration);
    const ok = check(res, {
      "track list 200": (r) => r.status === 200,
      "track list has JSON body": (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    sleep(0.5);
  }

  // 2. Range probe (HEAD request)
  {
    const res = http.head(SAMPLE_STREAM_URL, { timeout: "8s" });
    streamHeadLatency.add(res.timings.duration);
    const ok = check(res, {
      "range probe 200 or 206": (r) => r.status === 200 || r.status === 206,
    });
    errorRate.add(!ok);
    sleep(0.3);
  }

  // 3. Streaming range GET (simulate seek to 50% of a ~5MB file)
  {
    const startByte = 2_500_000;
    const endByte = startByte + 256 * 1024 - 1; // 256 KB chunk
    const res = http.get(SAMPLE_STREAM_URL, {
      headers: { Range: `bytes=${startByte}-${endByte}` },
      timeout: "15s",
    });
    streamRangeLatency.add(res.timings.duration);
    const ok = check(res, {
      "range response 206": (r) => r.status === 206,
      "range has content-range header": (r) => r.headers["Content-Range"] !== undefined,
    });
    // 200 is also acceptable (server may not support ranges but still responds)
    if (res.status === 200) errorRate.add(false);
    else errorRate.add(!ok);
    sleep(0.5);
  }

  // 4. Upload token request
  {
    const payload = JSON.stringify({
      filename: "test-track.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 5_000_000,
    });
    const res = http.post(`${API_URL}/upload/token`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: "10s",
    });
    uploadTokenLatency.add(res.timings.duration);
    // 401 / 403 is expected if no auth is configured in test env
    const ok = check(res, {
      "upload token responds": (r) => r.status < 500,
    });
    errorRate.add(!ok);
    sleep(1.0);
  }
}
