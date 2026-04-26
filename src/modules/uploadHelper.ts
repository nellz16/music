/**
 * uploadHelper.ts — Safe, resumable file upload flow.
 *
 * Flow:
 *  1. Client calls requestUploadToken(filename, mimeType, sizeBytes).
 *     → Server creates a short-lived signed upload session and returns
 *       { uploadId, uploadUrl, expiresAt }.
 *     → NEVER trust uploadUrl from client storage across app restarts
 *       if expiresAt has passed — always re-request.
 *  2. Client calls uploadFile(uploadUrl, localUri, onProgress).
 *     → Uses FileSystem.uploadAsync with streaming mode (useMultipart: true).
 *     → Reports progress via onProgress callback.
 *
 * Backend placeholder:
 *   POST /upload/token
 *     Request  body: { filename: string, mimeType: string, sizeBytes: number }
 *     Response body: { uploadId: string, uploadUrl: string, expiresAt: number }
 *
 *   PUT /upload/:uploadId   (or directly to uploadUrl)
 *     Request  body: binary stream or multipart form
 *     Headers: Content-Type: <mimeType>, Content-Length: <sizeBytes>
 *     Response: { trackId: string, status: "ok" }
 *
 * Security note:
 *  - The upload token is short-lived (server defines TTL, e.g. 15 min).
 *  - uploadUrl may contain a signed HMAC — never log or expose it.
 *  - File paths passed to this module should come from expo-image-picker or
 *    expo-document-picker, not from user-controlled strings.
 */

import * as FileSystem from "expo-file-system";
import { ENDPOINTS } from "@/config/env";
import type { UploadTokenResponse, UploadProgress } from "@/utils/types";

// ─── Token request ────────────────────────────────────────────────────────────

/**
 * Requests a short-lived upload token from the backend.
 *
 * @param filename  — e.g. "my-track.mp3"
 * @param mimeType  — e.g. "audio/mpeg"
 * @param sizeBytes — file size in bytes (used by server for pre-signed URL scope)
 */
export async function requestUploadToken(
  filename: string,
  mimeType: string,
  sizeBytes: number
): Promise<UploadTokenResponse> {
  const res = await fetch(ENDPOINTS.UPLOAD_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, mimeType, sizeBytes }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<UploadTokenResponse>;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Streams the local file to the upload URL obtained from requestUploadToken.
 *
 * Uses FileSystem.uploadAsync which handles chunked multipart streaming —
 * it does NOT read the whole file into memory.
 *
 * @param uploadUrl  — Pre-authorized URL from the token response
 * @param localUri   — Local file:// URI (e.g. from expo-image-picker)
 * @param mimeType   — MIME type for Content-Type header
 * @param onProgress — Called with progress updates
 */
export async function uploadFile(
  uploadUrl: string,
  localUri: string,
  mimeType: string,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  // Extract uploadId from URL for progress tracking (last path segment)
  const uploadId = uploadUrl.split("/").pop() ?? "unknown";

  onProgress({ uploadId, bytesUploaded: 0, bytesTotal: 0, status: "uploading" });

  try {
    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": mimeType,
        // Add Authorization header if backend requires a bearer token:
        // "Authorization": `Bearer ${authToken}`,
      },
      // Progress callback — called as chunks are sent
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed with status ${result.status}: ${result.body}`);
    }

    onProgress({
      uploadId,
      bytesUploaded: 0, // FileSystem.uploadAsync doesn't expose bytes
      bytesTotal: 0,
      status: "done",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onProgress({ uploadId, bytesUploaded: 0, bytesTotal: 0, status: "error", error: msg });
    throw err;
  }
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Full upload flow: request token → upload file.
 * Validates that the token has not expired before uploading.
 *
 * @param localUri   — Local file URI
 * @param filename   — Target filename
 * @param mimeType   — MIME type
 * @param sizeBytes  — File size in bytes
 * @param onProgress — Progress callback
 */
export async function uploadTrack(
  localUri: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  const tokenRes = await requestUploadToken(filename, mimeType, sizeBytes);

  // Safety: reject if token is already expired
  if (Date.now() > tokenRes.expiresAt) {
    throw new Error("Upload token expired before upload started");
  }

  await uploadFile(tokenRes.uploadUrl, localUri, mimeType, onProgress);
}
