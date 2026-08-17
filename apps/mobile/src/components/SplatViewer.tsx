import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSettings } from '../lib/i18n';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../lib/config';
// import { Asset } from 'expo-asset';

interface SplatViewerProps {
  treeCode: string;
  /**
   * URL to the Gaussian Splat file (.ksplat or .ply) in Cloudflare R2.
   * Used to derive the points3d.ply URL for the lightweight point cloud viewer.
   */
  splatFileUrl: string;
  /** Optional pre-resolved URL to the decimated point cloud (points3d.ply). */
  points3dUrl?: string | null;
  /** Optional static thumbnail shown before the user opts-in to load 3D. */
  thumbnailUrl?: string | null;
  /** Bearer token forwarded to the gaussian viewer for authenticated geometry-edit saves. */
  token?: string | null;
  /** Fired when the gaussian viewer reports the manual 3D edit was saved. */
  onMetricsUpdated?: () => void;
  onInteractionStateChange?: (interacting: boolean) => void;
  height?: number;
}

interface TimingReport {
  phase: string;
  ms: number;
}

/**
 * Derives the points3d.ply URL from a splat_file_url by replacing the
 * filename portion.
 *
 * Pattern:
 *   .../tree_scans/{tree_code}/{timestamp}_result.ksplat  →  {timestamp}_points3d.ply
 *   .../tree_scans/{tree_code}/{timestamp}_result.ply     →  {timestamp}_points3d.ply
 */
export function derivePoints3dUrl(splatFileUrl: string): string | null {
  if (!splatFileUrl) return null;
  try {
    const lastSlash = splatFileUrl.lastIndexOf('/');
    const baseDir   = splatFileUrl.substring(0, lastSlash + 1);
    const filename  = splatFileUrl.substring(lastSlash + 1).split('?')[0];
    const underscoreIdx = filename.indexOf('_');
    const tsPart = underscoreIdx > 0 ? filename.substring(0, underscoreIdx + 1) : '';
    return `${baseDir}${tsPart}points3d.ply`;
  } catch {
    return null;
  }
}

type ViewMode = 'thumbnail' | 'pointcloud' | 'gaussian';

/**
 * SplatViewer — mobile-optimised 3D viewer for Vora tree scans.
 *
 * UX flow:
 *   1. Default: thumbnail photo (< 100ms, zero GPU cost).
 *   2. "Lihat 3D" tap → lightweight PLY point cloud viewer (Three.js inlined,
 *      no CDN, estimated 1–3s on device).
 *   3. "Load Gaussian ✦" badge → full gaussian-splats-3d viewer (slow, opt-in).
 */
export default function SplatViewer({
  treeCode,
  splatFileUrl,
  points3dUrl: points3dUrlProp,
  thumbnailUrl,
  token,
  onMetricsUpdated,
  onInteractionStateChange,
  height = 320,
}: SplatViewerProps) {
  const { t } = useSettings();
  const webviewRef = useRef<WebView>(null);
  const [viewMode, setViewMode]       = useState<ViewMode>('thumbnail');
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [timing, setTiming]           = useState<TimingReport[]>([]);
  const [webviewCrashed, setWebviewCrashed] = useState(false);
  const [pcHtmlUri, setPcHtmlUri]     = useState<string | null>(null);

  // Resolve points3d URL (prop → derivation → null)
  const points3dUrl = points3dUrlProp || derivePoints3dUrl(splatFileUrl);

  // ── Load Point Cloud Asset ──────────────────────────────────────────────
  const loadPcAsset = useCallback(async () => {
    try {
      const asset = (require('expo-asset') as any).Asset.fromModule(require('../../assets/point-cloud-viewer.html'));
      await asset.downloadAsync();
      const baseUri = asset.localUri || asset.uri;
      const finalUri = `${baseUri}?plyUrl=${encodeURIComponent(points3dUrl || '')}&code=${encodeURIComponent(treeCode)}`;
      setPcHtmlUri(finalUri);
    } catch (err) {
      setLoadError(`Failed to load point cloud asset: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [points3dUrl, treeCode]);

  // ── Gaussian viewer URL ──────────────────────────────────────────────────
  const gaussianParams = new URLSearchParams({
    v: '12',
    code: treeCode,
    url: splatFileUrl,
    proxy: 'false',
  });
  if (token) gaussianParams.set('token', token);
  const gaussianUrl = `${API_BASE_URL}/viewer.html?${gaussianParams.toString()}`;

  // ── Message handler ──────────────────────────────────────────────────────
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;

      if (raw === 'vora_scene_loaded') {
        setSceneLoaded(true);
        return;
      }

      try {
        const parsed = JSON.parse(raw);

        if (parsed?.type === 'vora_timing') {
          const report: TimingReport = { phase: parsed.phase, ms: parsed.ms };
          setTiming(prev => {
            const next = [...prev, report];
            const phases = next.map(r => r.phase);
            if (phases.includes('first_frame_render')) {
              const net   = next.find(r => r.phase === 'splat_network_fetch')?.ms ?? 0;
              const parse = next.find(r => r.phase === 'lib_init')?.ms ?? 0;
              const frame = next.find(r => r.phase === 'first_frame_render')?.ms ?? 0;
              console.log(
                `[SplatViewer:${viewMode}] network=${net}ms parse=${parse}ms frame=${frame}ms total=${net+parse+frame}ms`,
              );
            }
            return next;
          });
          return;
        }

        if (parsed?.type === 'vora_point_cloud_error') {
          setLoadError(`Point cloud: ${parsed.message}`);
          return;
        }

        if (parsed?.type === 'vora_metrics_updated') {
          setEditMode(false);
          onMetricsUpdated?.();
        }
      } catch {
        // ignore non-JSON
      }
    },
    [onMetricsUpdated, viewMode],
  );

  const sendToViewer = useCallback((data: unknown) => {
    webviewRef.current?.injectJavaScript(
      `window.postMessage(${JSON.stringify(data)}, '*'); true;`,
    );
  }, []);

  const startEdit  = () => { setEditMode(true);  sendToViewer({ type: 'start_3d_edit' }); };
  const saveEdit   = () =>   sendToViewer({ type: 'save_3d_edit' });
  const cancelEdit = () => { setEditMode(false); sendToViewer({ type: 'cancel_3d_edit' }); };

  const resetToThumbnail = () => {
    setViewMode('thumbnail');
    setSceneLoaded(false);
    setLoadError(null);
    setTiming([]);
    setWebviewCrashed(false);
    setEditMode(false);
  };

  const enterViewMode = (mode: ViewMode) => {
    setSceneLoaded(false);
    setLoadError(null);
    setTiming([]);
    setWebviewCrashed(false);
    setViewMode(mode);
  };

  // ── Error state ──────────────────────────────────────────────────────────
  if (loadError && viewMode !== 'thumbnail') {
    return (
      <View style={[styles.container, { height }, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={32} color="#eda48d" style={{ marginBottom: 8 }} />
        <Text style={styles.errorText}>Could not load 3D view</Text>
        <Text style={styles.errorHint}>{loadError}</Text>
        <TouchableOpacity onPress={resetToThumbnail} style={[styles.retryBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }]}>
          <Ionicons name="arrow-back" size={14} color="#e7e5e4" />
          <Text style={styles.retryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Thumbnail (default) state ────────────────────────────────────────────
  if (viewMode === 'thumbnail') {
    return (
      <View style={[styles.container, { height }]}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.placeholderBg, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="leaf-outline" size={48} color="rgba(16, 185, 129, 0.4)" />
          </View>
        )}
        <View style={styles.thumbnailOverlay} />

        <View style={styles.loadPromptContent}>
          <Text style={styles.loadPromptTitle}>Model 3D Pohon</Text>
          <Text style={styles.loadPromptSub}>
            {points3dUrl
              ? 'Point cloud · estimasi < 3 detik'
              : 'Gaussian splat · estimasi 15–30 detik'}
          </Text>
          <TouchableOpacity
            style={[styles.load3dButton, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#616c39', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99 }]}
            onPress={async () => {
              if (points3dUrl) {
                enterViewMode('pointcloud');
                await loadPcAsset();
              } else {
                enterViewMode('gaussian');
              }
            }}
          >
            <Ionicons name="cube-outline" size={16} color="#ffffff" />
            <Text style={styles.load3dButtonText}>View 3D</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── WebView (point cloud or gaussian) ───────────────────────────────────
  const webviewSource =
    viewMode === 'pointcloud' && pcHtmlUri
      ? { uri: pcHtmlUri }
      : { uri: gaussianUrl };

  return (
    <View style={[styles.container, { height }]}>
      {webviewCrashed ? (
        <View style={[StyleSheet.absoluteFillObject, styles.centered, { backgroundColor: '#1c1917' }]}>
          <Text style={styles.errorText}>{t('viewer.crashed')}</Text>
          <Text style={styles.errorHint}>{t('viewer.crashedHint')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={resetToThumbnail}>
            <Text style={styles.retryBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{ flex: 1 }}
          onTouchStart={() => onInteractionStateChange?.(false)}
          onTouchEnd={() => onInteractionStateChange?.(true)}
          onTouchCancel={() => onInteractionStateChange?.(true)}
        >
          <WebView
            ref={webviewRef}
            source={webviewSource}
            style={styles.webview}
            onMessage={handleMessage}
            onError={e => setLoadError(e.nativeEvent.description || 'Unknown WebView error')}
            onHttpError={e => setLoadError(`HTTP ${e.nativeEvent.statusCode}`)}
            // Option C: WebView config tuning
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            originWhitelist={['*']}
            cacheEnabled={true}
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            mixedContentMode="always"
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            // Option 6: WebView crash detection
            onRenderProcessGone={() => setWebviewCrashed(true)}
          />
        </View>
      )}

      {/* Loading overlay */}
      {!sceneLoaded && !webviewCrashed && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#616c39" />
          <Text style={styles.loadingText}>
            {viewMode === 'pointcloud' ? 'Loading point cloud…' : 'Loading 3D splat…'}
          </Text>
          {timing.length > 0 && (
            <View style={styles.timingBox}>
              {timing.map(r => (
                <React.Fragment key={r.phase}>
                  <Text style={styles.timingRow}>
                    {r.phase}: {r.ms}ms
                  </Text>
                </React.Fragment>
              ))}
            </View>
          )}
          <TouchableOpacity style={[styles.cancelLoadBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]} onPress={resetToThumbnail}>
            <Ionicons name="arrow-back" size={14} color="#78716c" />
            <Text style={styles.cancelLoadText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Back button (after load) */}
      {sceneLoaded && (
        <TouchableOpacity style={styles.backBtn} onPress={resetToThumbnail}>
          <Ionicons name="close" size={18} color="#e7e5e4" />
        </TouchableOpacity>
      )}

      {/* Gaussian edit controls (only in gaussian mode after load) */}
      {sceneLoaded && viewMode === 'gaussian' && (
        <View style={styles.controlsBar}>
          {!editMode ? (
            <TouchableOpacity style={styles.controlButton} onPress={startEdit}>
              <Text style={styles.controlButtonText}>Edit 3D Alignment</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editButtonsRow}>
              <TouchableOpacity style={[styles.controlButton, styles.cancelButton]} onPress={cancelEdit}>
                <Text style={styles.controlButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.saveButton]} onPress={saveEdit}>
                <Text style={styles.controlButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Offer Gaussian upgrade after point cloud loaded */}
      {sceneLoaded && viewMode === 'pointcloud' && splatFileUrl && (
        <TouchableOpacity
          style={[styles.upgradeBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
          onPress={() => enterViewMode('gaussian')}
        >
          <Ionicons name="sparkles-outline" size={12} color="#5ea500" />
          <Text style={styles.upgradeBadgeText}>{t('viewer.loadSplat')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#1c1917' },
  webview:   { flex: 1, backgroundColor: '#1c1917' },
  centered:  { justifyContent: 'center', alignItems: 'center', padding: 20 },

  errorText:    { color: '#eda48d', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  errorHint:    { color: '#a8a29e', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  retryBtn:     { backgroundColor: '#292524', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: '#e7e5e4', fontSize: 12, fontWeight: '700' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1917',
  },
  loadingText:  { color: '#e7e5e4', fontSize: 13, fontWeight: '600', marginTop: 12 },
  timingBox: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 220,
  },
  timingRow:       { color: '#b7c096', fontSize: 10, fontFamily: 'monospace', lineHeight: 16 },
  cancelLoadBtn:   { marginTop: 20, paddingHorizontal: 16, paddingVertical: 8 },
  cancelLoadText:  { color: '#78716c', fontSize: 12 },

  controlsBar:    { position: 'absolute', bottom: 12, right: 12 },
  editButtonsRow: { flexDirection: 'row', gap: 8 },
  controlButton:  {
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  saveButton:        { backgroundColor: '#616c39' },
  cancelButton:      { backgroundColor: 'rgba(220,38,38,0.85)' },
  controlButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  backBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#e7e5e4', fontSize: 13, fontWeight: '700' },

  upgradeBadge: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  upgradeBadgeText: { color: '#5ea500', fontSize: 11, fontWeight: '700' },

  placeholderBg:     { backgroundColor: '#2b301a', justifyContent: 'center', alignItems: 'center' },
  placeholderIcon:   { fontSize: 48, opacity: 0.3 },
  thumbnailOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  loadPromptContent: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 24,
  },
  loadPromptTitle:   { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  loadPromptSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', marginBottom: 20, lineHeight: 16 },
  load3dButton: {
    backgroundColor: '#616c39', paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 100, elevation: 8,
    shadowColor: '#616c39', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  load3dButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
