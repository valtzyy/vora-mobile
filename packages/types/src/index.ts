// =============================================================================
// @vora/types — Single source of truth untuk semua TypeScript types
// Diturunkan langsung dari backend FastAPI schemas (server.py)
// JANGAN duplikasi types ini di web atau mobile — import dari sini
// =============================================================================

// ---------------------------------------------------------------------------
// Auth & User
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  display_name: string;
  is_demo_account: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number; // detik
  user: User;
}

// ---------------------------------------------------------------------------
// Species Classification (Pl@ntNet output)
// ---------------------------------------------------------------------------

export interface SpeciesPrediction {
  scientific_name: string;
  common_name: string;
  confidence: number; // 0–100 (percentage)
}

// ---------------------------------------------------------------------------
// 3D Geometry (disimpan di DB sebagai JSON)
// ---------------------------------------------------------------------------

export interface Geometry3D {
  center_x: number;
  center_y: number;
  center_z: number;
  dir_x: number;
  dir_y: number;
  dir_z: number;
  radius_units: number;
  h_min: number;
  h_max: number;
  h_target: number;
  scale_factor: number;
  slice_points_3d?: number;
}

// ---------------------------------------------------------------------------
// Scale / Calibration Status
// ---------------------------------------------------------------------------

export type ScaleStatus = "calibrated" | "uncalibrated";
export type CalibrationSource =
  | "manual_scan_specific"
  | "manual_default"
  | "auto_pose"
  | "uncalibrated_default";

// ---------------------------------------------------------------------------
// Quality Gate Status (dari dbh_extractor.py)
// ---------------------------------------------------------------------------

export type QualityStatus =
  | "ok"
  | "low_points"
  | "invalid_orientation"
  | "high_fit_error"
  | "low_inlier_ratio";

// ---------------------------------------------------------------------------
// Height / Allometric derivation mode
// ---------------------------------------------------------------------------

export type HeightUsed =
  | "full_height"
  | "dbh_only_fallback"
  | "user_manual_height";

// ---------------------------------------------------------------------------
// CarbonEstimation — response dari GET /status .carbon_estimation
// dan embedded di ScanRecord dari DB
// ---------------------------------------------------------------------------

export interface CarbonEstimation {
  dbh_cm: number;
  height_m: number;
  biomass_kg: number;
  above_ground_biomass_kg: number;
  below_ground_biomass_kg: number;
  carbon_kg: number;
  co2e_kg: number;
  co2e_low_kg: number;
  co2e_high_kg: number;
  co2e_uncertainty_pct: number;
  root_to_shoot_ratio: number;
  root_to_shoot_source: string;
  wood_density_used: number;
  wood_density_source: string;
  climate_zone_detected: string;
  formula_used: string;
  scale_factor_used: number;
  calibrated: boolean;
  calibration_source: CalibrationSource;
  scale_status: ScaleStatus;
  height_used: HeightUsed;
  quality_status: QualityStatus;
  confidence: string;
  disclaimer: string;
  geometry_3d?: Geometry3D;
}

// ---------------------------------------------------------------------------
// ScanRecord — row dari tabel tree_scans di Cloudflare D1
// Matching dengan response dari GET /history/{tree_code} dan GET /scans
// ---------------------------------------------------------------------------

export interface ScanRecord {
  id: number;
  scan_date: string;               // ISO timestamp string
  tree_code: string;               // e.g. "POHON-1234"
  dbh_cm: number | null;
  tinggi_m: number | null;
  biomassa_kg: number | null;
  karbon_kg: number | null;
  co2e_kg: number | null;
  splat_file_url: string;          // URL ke .ply di Cloudflare R2
  thumbnail_url?: string | null;
  confidence_note?: string;
  // Species
  species_predictions?: SpeciesPrediction[] | string | null;
  wood_density_used?: number;
  wood_density_source?: string;
  climate_zone_detected?: string;
  formula_used?: string;
  // Biomass breakdown
  agb_kg?: number | null;
  bgb_kg?: number | null;
  // GPS
  gps_lat?: number | null;
  gps_lon?: number | null;
  // Calibration & scale
  scale_status?: ScaleStatus;
  scale_factor_used?: number;
  calibration_source?: CalibrationSource;
  // Height details
  height_used?: HeightUsed;
  total_height_used_m?: number | null;
  segment_height_m?: number | null;
  height_fallback_reason?: string;
  height_validated?: boolean;
  height_validation_reason?: string;
  // Quality
  quality_status?: QualityStatus;
  // Uncertainty
  root_to_shoot_ratio?: number;
  co2e_uncertainty_pct?: number;
  co2e_low_kg?: number | null;
  co2e_high_kg?: number | null;
  // Plot association
  plot_id?: number | null;
  claimed_by_user_id?: number | null;
  grid_position_x?: number | null;
  grid_position_y?: number | null;
  // 3D geometry overlay
  geometry_3d?: Geometry3D | string | null;
}

// ---------------------------------------------------------------------------
// Pipeline Status — response dari GET /status
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "idle"
  | "extracting"
  | "extracted"
  | "reconstructing"
  | "done"
  | "error";

export interface PipelineStatus {
  stage: PipelineStage;
  message: string;
  frame_count: number;
  error: string | null;
  carbon_estimation: CarbonEstimation | null;
  overlap_warning: string | null;
  frames: string[];        // filename list (JPG frames)
  has_result: boolean;
  calibration_frame: unknown | null;
  tree_code: string | null;
  started_at: number | null; // Unix timestamp
}

// ---------------------------------------------------------------------------
// Plot — row dari tabel carbon_plots
// ---------------------------------------------------------------------------

export interface PlotArea {
  id?: number;
  name?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlotOwner {
  username: string;
  display_name: string;
}

export interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  gps_centroid_lat: number | null;
  gps_centroid_lon: number | null;
  session_active: boolean;
  created_at: string;
  // `owner` is only populated by GET /plots/{plot_code} (detail); the list
  // endpoints (GET /plots, GET /users/{id}/plots) return the raw plot row
  // without a joined owner object.
  owner?: PlotOwner;
  owner_user_id?: number;
  target_co2e_kg: number | null;
  area_x1?: number | null;
  area_y1?: number | null;
  area_x2?: number | null;
  area_y2?: number | null;
  areas?: PlotArea[];
  // Only populated by the list endpoints (GET /plots, GET /users/{id}/plots),
  // which enrich each row with a per-plot scan aggregate. GET /plots/{code}
  // (detail) returns these as sibling top-level fields instead (`scans_count`,
  // `aggregation.total_co2e_kg`) — see PlotDetailResponse below.
  scans_count?: number;
  total_co2e_kg?: number;
  thumbnails?: string[];
}

export interface CreatePlotRequest {
  name: string;
  description?: string;
  privacy?: "public" | "private";
  gps_centroid_lat?: number;
  gps_centroid_lon?: number;
  target_co2e_kg?: number;
}

export interface CreatePlotResponse {
  success: boolean;
  plot_code: string;
}

export interface PlotDetailResponse {
  success: boolean;
  plot: Plot;
  scans_count: number;
  scans: ScanRecord[];
  aggregation: PlotAggregation;
}

// ---------------------------------------------------------------------------
// Aggregation — dari GET /plots/{plot_code}
// ---------------------------------------------------------------------------

export interface PlotAggregation {
  total_co2e_kg: number;
  combined_uncertainty_kg: number;
  combined_uncertainty_pct: number;
}

// ---------------------------------------------------------------------------
// API Request types
// ---------------------------------------------------------------------------

export interface ReconstructRequest {
  tree_code?: string;
  remove_background?: boolean;
  gps_lat?: number;
  gps_lon?: number;
  p1?: [number, number];   // [x_pixel, y_pixel] trunk top
  p2?: [number, number];   // [x_pixel, y_pixel] trunk bottom
  width?: number;
  height?: number;
}

export interface Recalculate2DRequest {
  p1: [number, number];
  p2: [number, number];
  width: number;
  height: number;
}

export interface RecalculateResult {
  success: boolean;
  tree_code: string;
  dbh_cm: number;
  height_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  confidence_note: string;
  scale_status: ScaleStatus;
  height_used: HeightUsed;
  total_height_used_m: number;
  segment_height_m: number;
  height_fallback_reason: string;
  height_validated: boolean;
}

// ---------------------------------------------------------------------------
// Manual 3D geometry adjustment — PATCH /scan/{id}/adjust-geometry
// ---------------------------------------------------------------------------

export interface AdjustGeometryRequest {
  center_x: number;
  center_y: number;
  center_z: number;
  dir_x: number;
  dir_y: number;
  dir_z: number;
  radius_units: number;
  h_min: number;
  h_max: number;
  h_target: number;
}

export interface AdjustGeometryResult {
  success: boolean;
  tree_code: string;
  dbh_cm: number;
  height_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  scale_status: ScaleStatus;
  height_used: HeightUsed;
  total_height_used_m: number;
  segment_height_m: number;
  height_fallback_reason: string;
  height_validated: boolean;
  height_validation_reason: string;
  quality_status: QualityStatus;
  root_to_shoot_ratio: number;
  co2e_uncertainty_pct: number;
  co2e_low_kg: number;
  co2e_high_kg: number;
}

// ---------------------------------------------------------------------------
// Direct-to-R2 video upload — GET /video_upload_url, POST /upload_video
// ---------------------------------------------------------------------------

export interface VideoUploadUrlResponse {
  /** Presigned R2 PUT URL, valid 5 minutes */
  url: string;
  /** R2 object key to pass back to notifyUploadVideo() */
  key: string;
}

export interface NotifyUploadVideoRequest {
  r2_key: string;
  frames?: number;
  blur_thresh?: number;
}

// ---------------------------------------------------------------------------
// Plot management requests
// ---------------------------------------------------------------------------

export interface UpdatePlotRequest {
  name?: string;
  description?: string;
  privacy?: "public" | "private";
  gps_centroid_lat?: number;
  gps_centroid_lon?: number;
  target_co2e_kg?: number;
  area_x1?: number;
  area_y1?: number;
  area_x2?: number;
  area_y2?: number;
}

export interface RemoveScanRequest {
  tree_code: string;
}

export interface GridPositionItem {
  tree_code: string;
  grid_position_x: number;
  grid_position_y: number;
}

export interface SaveLayoutRequest {
  layout: GridPositionItem[];
  area_x1?: number;
  area_y1?: number;
  area_x2?: number;
  area_y2?: number;
  areas?: PlotArea[];
}

// ---------------------------------------------------------------------------
// API Response wrappers
// ---------------------------------------------------------------------------

export interface ScansListResponse {
  success: boolean;
  scans: ScanRecord[];
}

export interface PlotsListResponse {
  plots: Plot[];
}

export interface UploadResponse {
  queued: boolean;
}

export interface ReconstructResponse {
  started: boolean;
  tree_code: string;
}
