// =============================================================================
// @vora/domain — Business logic satu sumber kebenaran
//
// Import dari sini di web DAN mobile. JANGAN copy-paste logic ini.
// Setiap kali ada perubahan threshold/formula display → ubah di sini saja.
// =============================================================================

import type {
  SpeciesPrediction,
  ScaleStatus,
  CalibrationSource,
  QualityStatus,
  HeightUsed,
} from "@vora/types";

// ---------------------------------------------------------------------------
// 1. SPECIES CONFIDENCE THRESHOLD
//    Konsisten dengan backend (server.py: SPECIES_CONFIDENCE_THRESHOLD = 30.0)
// ---------------------------------------------------------------------------

export const SPECIES_CONFIDENCE_THRESHOLD = 30; // persen

export interface SpeciesDisplayResult {
  /** Nama untuk ditampilkan di UI */
  displayName: string;
  /** Nama ilmiah jika teridentifikasi (null jika fallback) */
  scientificName: string | null;
  /** Nama umum jika tersedia */
  commonName: string | null;
  /** True jika confidence >= SPECIES_CONFIDENCE_THRESHOLD */
  isIdentified: boolean;
  /** Prediction teratas (null jika tidak ada) */
  topPrediction: SpeciesPrediction | null;
  /** Confidence 0-100, null jika tidak ada prediction */
  confidence: number | null;
  /** Semua predictions (sudah diparsed) */
  allPredictions: SpeciesPrediction[];
}

/**
 * Parse dan evaluasi species predictions dari backend.
 * Handles double-JSON-stringify yang terjadi di web frontend juga.
 * Menerapkan threshold: jika confidence < 30% → tampilkan sebagai "belum teridentifikasi"
 */
export function getDisplaySpecies(
  rawPredictions: SpeciesPrediction[] | string | null | undefined
): SpeciesDisplayResult {
  const predictions = parseSpeciesPredictions(rawPredictions);

  if (predictions.length === 0) {
    return {
      displayName: "Spesies tidak teridentifikasi",
      scientificName: null,
      commonName: null,
      isIdentified: false,
      topPrediction: null,
      confidence: null,
      allPredictions: [],
    };
  }

  const top = predictions[0];

  if (top.confidence < SPECIES_CONFIDENCE_THRESHOLD) {
    return {
      displayName: "Spesies belum teridentifikasi (estimasi generik)",
      scientificName: null,
      commonName: null,
      isIdentified: false,
      topPrediction: top,
      confidence: top.confidence,
      allPredictions: predictions,
    };
  }

  return {
    displayName: top.scientific_name,
    scientificName: top.scientific_name,
    commonName: top.common_name || null,
    isIdentified: true,
    topPrediction: top,
    confidence: top.confidence,
    allPredictions: predictions,
  };
}

/**
 * Parse species_predictions dari format DB (mungkin double-stringified JSON).
 * Konsisten dengan helper getSpeciesPredictions() di web frontend.
 */
export function parseSpeciesPredictions(
  raw: SpeciesPrediction[] | string | null | undefined
): SpeciesPrediction[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  let parsed: unknown = raw;
  // Pertama kali parse
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  // Double-parse: backend kadang double-stringify
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  return Array.isArray(parsed) ? (parsed as SpeciesPrediction[]) : [];
}

// ---------------------------------------------------------------------------
// 2. FORMATTING FUNCTIONS
//    Gunakan fungsi ini untuk SEMUA display. Jangan inline .toFixed() di UI.
// ---------------------------------------------------------------------------

/**
 * Format CO₂e untuk display utama (default 1 desimal)
 * @example formatCO2e(710.3) → "710.3 kg CO₂e"
 * @example formatCO2e(null) → "--"
 */
export function formatCO2e(
  kg: number | null | undefined,
  decimals = 1
): string {
  if (kg == null) return "--";
  return `${kg.toFixed(decimals)} kg CO₂e`;
}

/**
 * Format CO₂e untuk cards/summary (0 desimal, lebih compact)
 * @example formatCO2eCompact(710.3) → "710 kg CO₂e"
 */
export function formatCO2eCompact(kg: number | null | undefined): string {
  return formatCO2e(kg, 0);
}

/**
 * Format CO₂e sebagai range uncertainty: "639.3 – 781.4 kg CO₂e"
 */
export function formatCO2eRange(
  lowKg: number | null | undefined,
  highKg: number | null | undefined,
  pct?: number | null
): string {
  if (lowKg == null || highKg == null) return "--";
  const rangeStr = `${lowKg.toFixed(1)} – ${highKg.toFixed(1)} kg CO₂e`;
  if (pct != null) return `${rangeStr} (±${pct.toFixed(0)}%)`;
  return rangeStr;
}

/**
 * Format biomassa total
 * @example formatBiomass(412.3) → "412.3 kg"
 */
export function formatBiomass(kg: number | null | undefined): string {
  if (kg == null) return "--";
  return `${kg.toFixed(1)} kg`;
}

/**
 * Format DBH (Diameter Breast Height)
 * @example formatDBH(32.5) → "32.5 cm"
 */
export function formatDBH(cm: number | null | undefined): string {
  if (cm == null) return "--";
  return `${cm.toFixed(1)} cm`;
}

/**
 * Format tinggi pohon
 * @example formatHeight(8.1) → "8.1 m"
 */
export function formatHeight(m: number | null | undefined): string {
  if (m == null) return "--";
  return `${m.toFixed(1)} m`;
}

/**
 * Format karbon (carbon stock)
 * @example formatCarbon(193.8) → "193.8 kg C"
 */
export function formatCarbon(kg: number | null | undefined): string {
  if (kg == null) return "--";
  return `${kg.toFixed(1)} kg C`;
}

/**
 * Format wood density
 * @example formatWoodDensity(0.6) → "0.60 g/cm³"
 */
export function formatWoodDensity(density: number | null | undefined): string {
  if (density == null) return "--";
  return `${density.toFixed(2)} g/cm³`;
}

/**
 * Format koordinat GPS
 * @example formatGPS(-6.2088, 106.8456) → "-6.2088°, 106.8456°"
 */
export function formatGPS(
  lat: number | null | undefined,
  lon: number | null | undefined
): string {
  if (lat == null || lon == null) return "Tidak tersedia";
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

/**
 * Format confidence sebagai persentase
 * @example formatConfidence(87.3) → "87.3%"
 */
export function formatConfidence(pct: number | null | undefined): string {
  if (pct == null) return "--";
  return `${pct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// 3. SCALE STATUS
// ---------------------------------------------------------------------------

export interface ScaleStatusInfo {
  label: string;
  color: "green" | "amber" | "red";
  shortLabel: string;
  description: string;
}

/**
 * Informasi tampilan status kalibrasi skala.
 * Satu sumber kebenaran untuk label + warna di web dan mobile.
 */
export function getScaleStatusInfo(
  status: ScaleStatus | string | undefined,
  calibrationSource?: CalibrationSource | string
): ScaleStatusInfo {
  if (status === "calibrated") {
    const sourceLabel =
      calibrationSource === "auto_pose"
        ? "MediaPipe auto-pose"
        : calibrationSource === "manual_scan_specific"
        ? "manual (scan ini)"
        : calibrationSource === "manual_default"
        ? "manual (default)"
        : "terkalibrasi";
    return {
      label: "Terkalibrasi",
      shortLabel: "✓ Kalibrasi OK",
      color: "green",
      description: `Skala sudah diverifikasi via ${sourceLabel}. Estimasi lebih akurat.`,
    };
  }
  return {
    label: "Belum Terkalibrasi",
    shortLabel: "⚠ Belum Kalibrasi",
    color: "amber",
    description:
      "Skala menggunakan estimasi generik (scale_factor = 1.0). Akurasi DBH mungkin kurang presisi.",
  };
}

// ---------------------------------------------------------------------------
// 4. HEIGHT STATUS & DISCLAIMER
// ---------------------------------------------------------------------------

export interface HeightStatusInfo {
  label: string;
  showDisclaimer: boolean;
  disclaimer?: string;
}

/**
 * Info status tinggi pohon dan disclaimer jika berlaku.
 * Disclaimer ini WAJIB ditampilkan jika showDisclaimer = true — konsisten web & mobile.
 */
export function getHeightStatusInfo(
  heightUsed: HeightUsed | string | undefined
): HeightStatusInfo {
  switch (heightUsed) {
    case "full_height":
      return {
        label: "Tinggi Penuh",
        showDisclaimer: false,
      };
    case "user_manual_height":
      return {
        label: "Input Manual",
        showDisclaimer: false,
      };
    case "dbh_only_fallback":
      return {
        label: "Fallback DBH-Only",
        showDisclaimer: true,
        disclaimer:
          "⚠ Tinggi pohon tidak dapat diverifikasi dari rekonstruksi ini. " +
          "Formula biomassa menggunakan DBH saja (Chave 2005 tanpa komponen tinggi). " +
          "Akurasi estimasi lebih rendah.",
      };
    default:
      return {
        label: "Tidak diketahui",
        showDisclaimer: true,
        disclaimer: "Status tinggi pohon tidak dapat ditentukan dari data rekonstruksi.",
      };
  }
}

// ---------------------------------------------------------------------------
// 5. QUALITY GATE STATUS
// ---------------------------------------------------------------------------

export interface QualityStatusInfo {
  isOk: boolean;
  label: string;
  description: string;
  color: "green" | "amber" | "red";
}

/**
 * Informasi tampilan quality gate rekonstruksi 3D.
 * Threshold sesuai dbh_extractor.py:
 *   low_points: < 10 titik di slice DBH
 *   high_fit_error: mean_fit_error_cm > 10.0
 *   low_inlier_ratio: inlier_ratio < 0.15
 */
export function getQualityStatusInfo(
  status: QualityStatus | string | undefined
): QualityStatusInfo {
  switch (status) {
    case "ok":
      return {
        isOk: true,
        label: "Kualitas OK",
        description: "Rekonstruksi 3D berkualitas baik. Estimasi dapat diandalkan.",
        color: "green",
      };
    case "low_points":
      return {
        isOk: false,
        label: "Point Rendah",
        description:
          "Terlalu sedikit titik 3D di slice DBH (<10). Mungkin perlu rekam ulang dengan lebih banyak lingkaran.",
        color: "amber",
      };
    case "high_fit_error":
      return {
        isOk: false,
        label: "Fit Error Tinggi",
        description:
          "Error fitting silinder >10 cm. Rekonstruksi mungkin tidak merepresentasikan batang dengan akurat.",
        color: "amber",
      };
    case "low_inlier_ratio":
      return {
        isOk: false,
        label: "Inlier Rendah",
        description:
          "Rasio inlier <15%. Banyak titik outlier — rekonstruksi mungkin terdistorsi.",
        color: "amber",
      };
    case "invalid_orientation":
      return {
        isOk: false,
        label: "Orientasi Invalid",
        description:
          "Sumbu silinder tidak terdeteksi dengan benar. Coba rekam ulang dengan posisi kamera lebih stabil.",
        color: "red",
      };
    default:
      return {
        isOk: false,
        label: "Status Tidak Diketahui",
        description: "Tidak dapat menentukan kualitas rekonstruksi.",
        color: "amber",
      };
  }
}

// ---------------------------------------------------------------------------
// 6. PIPELINE STAGE LABELS
// ---------------------------------------------------------------------------

export interface StageInfo {
  label: string;
  description: string;
  progressPct: number; // estimasi persentase progress (0-100)
  isTerminal: boolean;
}

export function getPipelineStageInfo(
  stage: string,
  message?: string
): StageInfo {
  switch (stage) {
    case "idle":
      return { label: "Siap", description: "Sistem siap menerima video baru.", progressPct: 0, isTerminal: false };
    case "extracting":
      return { label: "Mengekstrak Frame", description: message || "Memproses video...", progressPct: 15, isTerminal: false };
    case "extracted":
      return { label: "Frame Siap", description: "Frame berhasil diekstrak. Menunggu rekonstruksi...", progressPct: 30, isTerminal: false };
    case "reconstructing":
      return {
        label: "Merekonstruksi 3D",
        description: message || "GPU sedang memproses...",
        progressPct: mapReconstructingProgress(message),
        isTerminal: false,
      };
    case "done":
      return { label: "Selesai", description: "Rekonstruksi berhasil!", progressPct: 100, isTerminal: true };
    case "error":
      return { label: "Error", description: message || "Terjadi kesalahan.", progressPct: 0, isTerminal: true };
    default:
      return { label: stage, description: message || "", progressPct: 0, isTerminal: false };
  }
}

/** Map pesan rekonstruksi ke estimasi progress persen (50-95%) */
function mapReconstructingProgress(message?: string): number {
  if (!message) return 50;
  const msg = message.toLowerCase();
  if (msg.includes("uploading image")) return 50;
  if (msg.includes("initializing") || msg.includes("geometry")) return 55;
  if (msg.includes("mast3r") || msg.includes("matching")) return 60;
  if (msg.includes("training") || msg.includes("gaussian")) return 70;
  if (msg.includes("point cloud")) return 80;
  if (msg.includes("computing dbh") || msg.includes("carbon")) return 88;
  if (msg.includes("uploading result")) return 94;
  return 65;
}

// ---------------------------------------------------------------------------
// 7. SCAN VALIDITY CHECK
// ---------------------------------------------------------------------------

/**
 * Apakah scan memiliki data metrik valid (bukan scan gagal/incomplete)?
 */
export function isScanValid(scan: {
  dbh_cm?: number | null;
  co2e_kg?: number | null;
}): boolean {
  return scan.dbh_cm != null && scan.dbh_cm > 0;
}

/**
 * Apakah scan punya koordinat GPS yang valid?
 */
export function hasScanGPS(scan: {
  gps_lat?: number | null;
  gps_lon?: number | null;
}): boolean {
  return scan.gps_lat != null && scan.gps_lon != null;
}
