// NOTE: expo-file-system's API changed significantly in recent Expo SDKs
// (see apps/mobile/AGENTS.md — verify against the installed SDK's bundled
// docs before relying on this). The default `expo-file-system` import no
// longer has any network functions at all (uploadAsync/createUploadTask are
// deprecated no-op stubs there) — only `expo-file-system/legacy` still has
// them, which is why this file imports from that subpath. createUploadTask
// (used below) streams the file from disk the same way uploadAsync does
// (no in-memory Blob buffering — important for multi-hundred-MB tree scan
// videos), it just also reports progress via a callback.
import * as FileSystem from 'expo-file-system/legacy';
import { client } from './voraClient';

export interface VideoSource {
  uri: string;
  name: string;
  mimeType: string;
}

export interface UploadVideoOptions {
  frames: number;
  blurThresh: number;
  posesPath?: string;
  /** Called repeatedly during the R2 upload with bytes sent / total bytes. */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Runs the full 3-step direct-to-R2 video upload contract:
 *   1. GET /video_upload_url  -> presigned PUT URL + R2 key
 *   2. PUT the video bytes straight to R2 (never touches this backend)
 *   3. POST /upload_video     -> tells the backend to start frame extraction
 *
 * Caller is responsible for polling GET /status afterwards.
 */
export async function uploadVideoToBackend(
  video: VideoSource,
  options: UploadVideoOptions
): Promise<void> {
  const { url, key } = await client.pipeline.getVideoUploadUrl(video.name, video.mimeType);

  // createUploadTask (rather than the one-shot uploadAsync) gives us a
  // progress callback while still streaming from disk — same native
  // implementation under the hood, just with progress events wired up.
  const uploadTask = FileSystem.createUploadTask(
    url,
    video.uri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': video.mimeType },
    },
    (data) => {
      options.onProgress?.(data.totalBytesSent, data.totalBytesExpectedToSend);
    }
  );
  const uploadResult = await uploadTask.uploadAsync();

  if (!uploadResult || uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`R2 upload failed: HTTP ${uploadResult?.status ?? 'unknown'}`);
  }

  let cameraPoses: any[] | undefined = undefined;
  if (options.posesPath) {
    try {
      const standardFS = require('expo-file-system');
      const raw = await standardFS.readAsStringAsync(options.posesPath);
      cameraPoses = JSON.parse(raw);
      console.log(`[videoUpload] Loaded ${cameraPoses?.length} camera poses from ${options.posesPath}`);
    } catch (err) {
      console.error('[videoUpload] Failed to read poses file:', err);
    }
  }

  await client.pipeline.notifyUploadVideo({
    r2Key: key,
    frames: options.frames,
    blurThresh: options.blurThresh,
    cameraPoses,
  });
}
