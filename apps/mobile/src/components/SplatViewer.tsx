import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { API_BASE_URL } from '../lib/config';

interface SplatViewerProps {
  treeCode: string;
  splatFileUrl: string;
  /** Bearer token, if logged in — forwarded so the viewer's own internal
   * adjust-geometry fetch (see vora/viewer.html) can authenticate once the
   * backend requires it. Safe to omit; web keeps using its cookie session. */
  token?: string | null;
  /** Fired when the viewer reports the manual 3D edit was saved, so the
   * caller can refetch scan metrics. */
  onMetricsUpdated?: () => void;
  height?: number;
}

/**
 * Embeds the backend's existing web-based Gaussian Splat viewer
 * (vora/viewer.html) inside a WebView — same URL contract as the web app's
 * <iframe>. Communication uses a postMessage bridge: viewer.html mirrors its
 * window.parent.postMessage(...) calls to window.ReactNativeWebView.postMessage(...)
 * when running inside a WebView (see the `postToParent` helper added there),
 * and this component uses injectJavaScript to dispatch messages back in
 * (window.postMessage inside the page's own context — the page's existing
 * `message` event listener handles that identically to a real cross-frame
 * postMessage).
 */
export default function SplatViewer({
  treeCode,
  splatFileUrl,
  token,
  onMetricsUpdated,
  height = 320,
}: SplatViewerProps) {
  const webviewRef = useRef<WebView>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const params = new URLSearchParams({
    v: '11',
    code: treeCode,
    url: splatFileUrl,
    proxy: 'true', // let viewer.html rewrite to /splat-proxy/... internally
  });
  if (token) params.set('token', token);
  const viewerUrl = `${API_BASE_URL}/viewer.html?${params.toString()}`;

  const sendToViewer = useCallback((data: unknown) => {
    webviewRef.current?.injectJavaScript(`window.postMessage(${JSON.stringify(data)}, '*'); true;`);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;
      if (raw === 'vora_scene_loaded') {
        setSceneLoaded(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.type === 'vora_metrics_updated') {
          setEditMode(false);
          onMetricsUpdated?.();
        }
      } catch {
        // Not JSON and not the known bare string — ignore.
      }
    },
    [onMetricsUpdated]
  );

  const startEdit = () => {
    setEditMode(true);
    sendToViewer({ type: 'start_3d_edit' });
  };
  const saveEdit = () => sendToViewer({ type: 'save_3d_edit' });
  const cancelEdit = () => {
    setEditMode(false);
    sendToViewer({ type: 'cancel_3d_edit' });
  };

  if (loadError) {
    return (
      <View style={[styles.container, { height }, styles.centered]}>
        <Text style={styles.errorText}>Could not load 3D viewer.</Text>
        <Text style={styles.errorHint}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onMessage={handleMessage}
        onError={(e) => setLoadError(e.nativeEvent.description || 'Unknown WebView error')}
        onHttpError={(e) => setLoadError(`HTTP ${e.nativeEvent.statusCode}`)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        originWhitelist={['*']}
      />

      {!sceneLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading 3D splat...</Text>
          <Text style={styles.loadingHint}>
            First load can take a while if the server was idle (cold start).
          </Text>
        </View>
      )}

      {sceneLoaded && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  webview: { flex: 1, backgroundColor: '#111827' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#fca5a5', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  errorHint: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: { color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginTop: 12 },
  loadingHint: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  controlsBar: { position: 'absolute', bottom: 12, right: 12 },
  editButtonsRow: { flexDirection: 'row', gap: 8 },
  controlButton: {
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButton: { backgroundColor: '#16a34a' },
  cancelButton: { backgroundColor: 'rgba(220,38,38,0.85)' },
  controlButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});
