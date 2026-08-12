// =============================================================================
// @vora/api-client — Typed HTTP client ke backend Vora FastAPI
//
// Import dari sini di web DAN mobile. Jangan tulis fetch langsung di komponen.
// BACKEND_URL harus di-set lewat createVoraClient({ baseUrl }) sebelum dipakai.
// =============================================================================

import type {
  PipelineStatus,
  ScanRecord,
  Plot,
  User,
  AuthTokenResponse,
  ReconstructRequest,
  RecalculateResult,
  Recalculate2DRequest,
  AdjustGeometryRequest,
  AdjustGeometryResult,
  ScansListResponse,
  PlotsListResponse,
  PlotDetailResponse,
  CreatePlotRequest,
  CreatePlotResponse,
  UploadResponse,
  ReconstructResponse,
  VideoUploadUrlResponse,
  UpdatePlotRequest,
  RemoveScanRequest,
  SaveLayoutRequest,
} from "@vora/types";

// ---------------------------------------------------------------------------
// Config & Cookie adapter
// ---------------------------------------------------------------------------

export interface CookieAdapter {
  /** Baca semua cookies untuk URL tertentu, return sebagai header Cookie string */
  getCookieHeader(url: string): Promise<string | null>;
  /** Simpan cookies dari response header Set-Cookie */
  saveCookies(url: string, setCookieHeader: string): Promise<void>;
  /** Clear semua cookies (untuk logout) */
  clearCookies(url: string): Promise<void>;
}

export interface VoraClientConfig {
  /** Base URL backend, e.g. "https://vora-52k9.onrender.com" */
  baseUrl: string;
  /**
   * Cookie adapter untuk React Native.
   * Di web (browser) biarkan null — browser otomatis handle cookies.
   * Di React Native: inject adapter yang pakai @react-native-cookies/cookies.
   */
  cookieAdapter?: CookieAdapter;
  /**
   * Bearer token untuk auth mobile (JWT dari POST /auth/token).
   * Jika null, fallback ke cookie-based auth.
   */
  bearerToken?: string | null;
  /** Callback ketika session expired (401 response) */
  onUnauthorized?: () => void;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export class VoraApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public endpoint: string
  ) {
    super(`Vora API Error [${status}] ${endpoint}: ${detail}`);
    this.name = "VoraApiError";
  }
}

// ---------------------------------------------------------------------------
// Client Factory
// ---------------------------------------------------------------------------

export function createVoraClient(config: VoraClientConfig) {
  const { baseUrl, cookieAdapter, onUnauthorized } = config;
  let _bearerToken = config.bearerToken ?? null;

  /** Update bearer token (e.g. setelah login mobile) */
  function setBearerToken(token: string | null) {
    _bearerToken = token;
  }

  // -----------------------------------------------------------------------
  // Internal fetch wrapper
  // -----------------------------------------------------------------------

  async function apiFetch<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      formData?: FormData;
      expectJson?: boolean;
    }
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {};

    // Auth: prefer bearer token (mobile), fallback ke cookie (web)
    if (_bearerToken) {
      headers["Authorization"] = `Bearer ${_bearerToken}`;
    } else if (cookieAdapter) {
      const cookieHeader = await cookieAdapter.getCookieHeader(url);
      if (cookieHeader) headers["Cookie"] = cookieHeader;
    }

    // Body
    let body: BodyInit | undefined;
    if (options?.formData) {
      body = options.formData;
      // Browser/RN set multipart boundary otomatis
    } else if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
      // Untuk web browser: kirim cookies otomatis
      credentials: cookieAdapter || _bearerToken ? "omit" : "include",
    });

    // Simpan cookies dari response (native only)
    if (cookieAdapter) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        await cookieAdapter.saveCookies(url, setCookie);
      }
    }

    if (res.status === 401) {
      onUnauthorized?.();
      throw new VoraApiError(401, "Session expired atau tidak terautentikasi", path);
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        detail = errBody.detail || errBody.message || detail;
      } catch {
        // ignore parse error
      }
      throw new VoraApiError(res.status, detail, path);
    }

    if (options?.expectJson === false) return undefined as unknown as T;

    try {
      return (await res.json()) as T;
    } catch {
      return undefined as unknown as T;
    }
  }

  // -----------------------------------------------------------------------
  // Auth Endpoints
  // -----------------------------------------------------------------------

  const auth = {
    /**
     * Login via cookie session (web-compatible).
     * Set httpOnly cookie di backend → browser kirim otomatis.
     */
    async loginCookie(
      username: string,
      password: string
    ): Promise<{ user: User }> {
      return apiFetch("POST", "/auth/login", {
        body: { username, password },
      });
    },

    /**
     * Login via Bearer token (JWT) — endpoint baru khusus mobile.
     * Menggunakan POST /auth/token sesuai plan.
     */
    async loginToken(
      username: string,
      password: string
    ): Promise<AuthTokenResponse> {
      const result = await apiFetch<AuthTokenResponse>("POST", "/auth/token", {
        body: { username, password },
      });
      _bearerToken = result.access_token;
      return result;
    },

    async logout(): Promise<void> {
      await apiFetch("POST", "/auth/logout", { expectJson: false });
      _bearerToken = null;
      if (cookieAdapter) {
        await cookieAdapter.clearCookies(baseUrl);
      }
    },

    async getMe(): Promise<User | null> {
      try {
        return await apiFetch<User>("GET", "/auth/me");
      } catch (e) {
        if (e instanceof VoraApiError && e.status === 401) return null;
        throw e;
      }
    },

    async register(
      username: string,
      password: string,
      displayName: string
    ): Promise<{ user: User }> {
      return apiFetch("POST", "/auth/register", {
        body: { username, password, display_name: displayName },
      });
    },
  };

  // -----------------------------------------------------------------------
  // Pipeline / Scan Endpoints
  // -----------------------------------------------------------------------

  const pipeline = {
    async getStatus(): Promise<PipelineStatus> {
      return apiFetch("GET", "/status");
    },

    /**
     * Step 1 of the direct-to-R2 video upload flow: request a short-lived
     * presigned PUT URL. The video bytes never pass through this backend —
     * step 2 is a raw `PUT` to the returned `url` (see `uploadFileToR2`),
     * then step 3 is `notifyUploadVideo()` below.
     */
    async getVideoUploadUrl(
      filename: string,
      contentType = "video/mp4"
    ): Promise<VideoUploadUrlResponse> {
      const qs = new URLSearchParams({ filename, content_type: contentType });
      return apiFetch("GET", `/video_upload_url?${qs.toString()}`);
    },

    /**
     * Step 3: tell the backend the R2 upload (step 2) finished, so it can
     * queue frame extraction. Poll `getStatus()` afterwards.
     */
    async notifyUploadVideo(options: {
      r2Key: string;
      frames?: number;
      blurThresh?: number;
    }): Promise<UploadResponse> {
      return apiFetch("POST", "/upload_video", {
        body: {
          r2_key: options.r2Key,
          frames: options.frames,
          blur_thresh: options.blurThresh,
        },
      });
    },

    async uploadPhotos(photos: (File | Blob)[]): Promise<UploadResponse> {
      const fd = new FormData();
      for (const photo of photos) fd.append("photos", photo);
      return apiFetch("POST", "/use_photos", { formData: fd });
    },

    async startReconstruct(
      req: ReconstructRequest = {}
    ): Promise<ReconstructResponse> {
      return apiFetch("POST", "/reconstruct", { body: req });
    },

    async cancelJob(): Promise<void> {
      await apiFetch("POST", "/cancel", { expectJson: false });
    },

    async getFirstFrame(): Promise<string> {
      // Return URL untuk di-load sebagai image
      return `${baseUrl}/frames/0000.jpg`;
    },
  };

  // -----------------------------------------------------------------------
  // Scan Records Endpoints
  // -----------------------------------------------------------------------

  const scans = {
    async getHistory(treeCode: string): Promise<ScanRecord[]> {
      const data = await apiFetch<{ scans?: ScanRecord[]; history?: ScanRecord[] }>(
        "GET",
        `/history/${encodeURIComponent(treeCode)}`
      );
      // Backend bisa return {scans:[...]} atau {history:[...]}
      return data.scans ?? data.history ?? (data as unknown as ScanRecord[]);
    },

    async getList(options?: {
      limit?: number;
      offset?: number;
    }): Promise<ScansListResponse> {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;
      return apiFetch("GET", `/scans?limit=${limit}&offset=${offset}`);
    },

    async recalculate(
      scanId: number,
      req: Recalculate2DRequest
    ): Promise<RecalculateResult> {
      return apiFetch("PATCH", `/scan/${scanId}/recalculate`, { body: req });
    },

    /** Manual 3D transform-controls override (cylinder geometry in raw point-cloud space). */
    async adjustGeometry(
      scanId: number,
      req: AdjustGeometryRequest
    ): Promise<AdjustGeometryResult> {
      return apiFetch("PATCH", `/scan/${scanId}/adjust-geometry`, { body: req });
    },

    async delete(treeCode: string): Promise<void> {
      await apiFetch("DELETE", `/scans/${encodeURIComponent(treeCode)}`, {
        expectJson: false,
      });
    },

    /** URL splat proxy untuk streaming PLY dari R2 (bypass DNS issues) */
    getSplatProxyUrl(treeCode: string, filename: string): string {
      return `${baseUrl}/splat-proxy/${encodeURIComponent(treeCode)}/${encodeURIComponent(filename)}`;
    },
  };

  // -----------------------------------------------------------------------
  // Plot Endpoints
  // -----------------------------------------------------------------------

  const plots = {
    async getList(): Promise<PlotsListResponse> {
      return apiFetch("GET", "/plots");
    },

    async getDetail(plotCode: string): Promise<PlotDetailResponse> {
      return apiFetch("GET", `/plots/${encodeURIComponent(plotCode)}`);
    },

    async create(data: CreatePlotRequest): Promise<CreatePlotResponse> {
      return apiFetch("POST", "/plots", { body: data });
    },

    async claimScan(
      plotId: number,
      treeCode: string
    ): Promise<{ success: boolean }> {
      return apiFetch("POST", `/plots/${plotId}/claim-scan`, {
        body: { tree_code: treeCode },
      });
    },

    async getUserPlots(userId: number): Promise<{ plots: Plot[] }> {
      return apiFetch("GET", `/users/${userId}/plots`);
    },

    async getUserScans(userId: number): Promise<{ scans: ScanRecord[] }> {
      return apiFetch("GET", `/users/${userId}/scans`);
    },

    /** Owner-only: update plot metadata (name/description/privacy/target/GPS). */
    async update(
      plotId: number,
      body: UpdatePlotRequest
    ): Promise<{ success: boolean }> {
      return apiFetch("PATCH", `/plots/${plotId}`, { body });
    },

    /** Owner-only: detach a scan from this plot (clears its grid position too). */
    async removeScan(
      plotId: number,
      treeCode: string
    ): Promise<{ success: boolean; message: string }> {
      const body: RemoveScanRequest = { tree_code: treeCode };
      return apiFetch("POST", `/plots/${plotId}/remove-scan`, { body });
    },

    /** Owner-only: persist tree grid positions + drawn area boxes (auto-save, e.g. 500ms debounce). */
    async saveLayout(
      plotId: number,
      body: SaveLayoutRequest
    ): Promise<{ success: boolean }> {
      return apiFetch("POST", `/plots/${plotId}/layout`, { body });
    },
  };

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  const health = {
    async ping(): Promise<{ status: string }> {
      return apiFetch("GET", "/ping");
    },
  };

  return {
    auth,
    pipeline,
    scans,
    plots,
    health,
    setBearerToken,
    get baseUrl() {
      return baseUrl;
    },
  };
}

export type VoraClient = ReturnType<typeof createVoraClient>;

// ---------------------------------------------------------------------------
// Direct-to-R2 upload — step 2 of the 3-step video upload flow
// (step 1: pipeline.getVideoUploadUrl, step 3: pipeline.notifyUploadVideo)
// ---------------------------------------------------------------------------

/**
 * PUT raw file bytes straight to the presigned R2 URL. This goes to Cloudflare
 * R2, not the Vora backend, so it deliberately bypasses `apiFetch` (no auth
 * header, different origin).
 *
 * On React Native, prefer `expo-file-system`'s `uploadAsync`/`createUploadTask`
 * over this helper for large video files — it streams from disk with upload
 * progress instead of buffering the whole file into a JS `Blob`. This plain
 * `fetch`-based helper is a web-compatible fallback (or fine for small files).
 */
export async function uploadFileToR2(
  presignedUrl: string,
  body: BodyInit,
  contentType?: string
): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
  if (!res.ok) {
    throw new VoraApiError(res.status, `R2 upload failed: HTTP ${res.status}`, presignedUrl);
  }
}

// ---------------------------------------------------------------------------
// Polling utility — dipakai untuk polling /status selama proses rekonstruksi
// ---------------------------------------------------------------------------

export interface PollOptions {
  intervalMs?: number;
  maxAttempts?: number;
  /** Henti jika callback return true */
  stopCondition: (status: PipelineStatus) => boolean;
  onUpdate?: (status: PipelineStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Poll GET /status secara periodik.
 * Return promise yang resolve dengan status akhir atau reject dengan error.
 */
export async function pollPipelineStatus(
  client: VoraClient,
  options: PollOptions
): Promise<PipelineStatus> {
  const {
    intervalMs = 3000,
    maxAttempts = 120, // 120 × 3s = 6 menit
    stopCondition,
    onUpdate,
    onError,
  } = options;

  return new Promise((resolve, reject) => {
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      if (attempts >= maxAttempts) {
        const err = new Error(
          `Polling timeout setelah ${maxAttempts} percobaan (${(maxAttempts * intervalMs) / 1000}s)`
        );
        onError?.(err);
        reject(err);
        return;
      }

      attempts++;

      try {
        const status = await client.pipeline.getStatus();
        onUpdate?.(status);

        if (stopCondition(status)) {
          resolve(status);
          return;
        }
      } catch (e) {
        onError?.(e as Error);
        // Tidak langsung reject — coba lagi sampai maxAttempts
      }

      setTimeout(poll, intervalMs);
    };

    poll();

    // Return cancel function via extra field (workaround karena Promise tidak support cancel)
    (resolve as unknown as { _cancel: () => void })._cancel = () => {
      cancelled = true;
    };
  });
}

/**
 * Retry fetch history dengan jeda (untuk handle D1 write lag).
 * Konsisten dengan `fetchTreeHistoryWithRetry` di web frontend.
 */
export async function fetchHistoryWithRetry(
  client: VoraClient,
  treeCode: string,
  maxRetries = 5,
  delayMs = 2000
): Promise<ScanRecord[]> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const history = await client.scans.getHistory(treeCode);
      if (history.length > 0) return history;
      // Data belum ada di D1 — tunggu dan retry
    } catch (e) {
      lastError = e as Error;
    }

    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (lastError) throw lastError;
  return [];
}
