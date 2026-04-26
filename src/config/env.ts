/**
 * env.ts — Centralizes all environment variable access.
 *
 * All EXPO_PUBLIC_* variables are inlined at build time by Babel.
 * Secret values (upload signing keys, etc.) never appear here —
 * they live server-side and are returned as short-lived tokens.
 *
 * ─── Required EAS secrets / .env variables ────────────────────────────────────
 *   EXPO_PUBLIC_API_URL   — Your backend base URL
 *                           Example: https://music-api.workers.dev
 *   EXPO_PUBLIC_CDN_URL   — CDN base URL for audio files
 *                           Example: https://cdn.r2.example.com
 *
 * For local dev create a .env file in the project root:
 *   EXPO_PUBLIC_API_URL=http://localhost:8787
 *   EXPO_PUBLIC_CDN_URL=http://localhost:8787
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com",
  CDN_URL: process.env.EXPO_PUBLIC_CDN_URL ?? "https://cdn.example.com",
} as const;

/** Endpoints derived from ENV.API_URL */
export const ENDPOINTS = {
  /** GET /tracks — returns Track[] */
  TRACKS: `${ENV.API_URL}/tracks`,
  /** GET /tracks/:id — returns Track */
  TRACK: (id: string) => `${ENV.API_URL}/tracks/${id}`,
  /** POST /upload/token — request a short-lived upload token */
  UPLOAD_TOKEN: `${ENV.API_URL}/upload/token`,
  /** PUT /upload/:uploadId — stream-upload the file */
  UPLOAD: (uploadId: string) => `${ENV.API_URL}/upload/${uploadId}`,
} as const;
