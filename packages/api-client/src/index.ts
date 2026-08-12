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
  PlotAggregation,
  User,
  AuthTokenResponse,
  ReconstructRequest,
  RecalculateResult,
  Recalculate2DRequest,
  ScansListResponse,
  PlotsListResponse,
  UploadResponse,
  ReconstructResponse,
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

    async uploadVideo(
      videoFile: File | Blob,
      options?: { frames?: number; blurThresh?: number }
    ): Promise<UploadResponse> {
      const fd = new FormData();
      fd.append("video", videoFile);
      if (options?.frames != null) fd.append("frames", options.frames.toString());
      if (options?.blurThresh != null) fd.append("blur_thresh", options.blurThresh.toString());
      return apiFetch("POST", "/upload_video", { formData: fd });
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

    async getDetail(
      plotCode: string
    ): Promise<{ plot: Plot; scans: ScanRecord[]; aggregation: PlotAggregation }> {
      return apiFetch("GET", `/plots/${encodeURIComponent(plotCode)}`);
    },

    async create(data: {
      name: string;
      description?: string;
      privacy?: "public" | "private";
      gps_centroid_lat?: number;
      gps_centroid_lon?: number;
      target_co2e_kg?: number;
    }): Promise<{ plot: Plot }> {
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
