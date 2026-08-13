import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../../lib/config';
import { useAuth } from '../../lib/AuthContext';
import { downloadAndShare } from '../../lib/fileShare';
import type { ScanStackParamList } from '../../navigation/types';

type Route = RouteProp<ScanStackParamList, 'CertificateViewer'>;

export default function CertificateViewerScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { treeCode } = route.params;
  const { token } = useAuth();
  const webviewRef = useRef<WebView>(null);

  const [downloading, setDownloading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rawPdfUrl = `${API_BASE_URL}/scans/${treeCode}/certificate`;

  // Download PDF locally on mount using authentication headers
  useEffect(() => {
    let active = true;
    const fetchPdf = async () => {
      try {
        const localUri = `${FileSystem.cacheDirectory}cert_preview_${treeCode}.pdf`;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const downloadResult = await FileSystem.downloadAsync(rawPdfUrl, localUri, {
          headers,
        });

        if (downloadResult.status !== 200) {
          throw new Error(`Server returned HTTP ${downloadResult.status}`);
        }

        // Read downloaded PDF as base64 string
        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (active) {
          setLocalPdfUri(downloadResult.uri);
          setPdfBase64(base64);
        }
      } catch (err) {
        console.error('[CertViewer Fetch Error]:', err);
        if (active) {
          setLoadError((err as Error)?.message || 'Failed to retrieve certificate.');
        }
      }
    };

    fetchPdf();
    return () => {
      active = false;
    };
  }, [treeCode, token]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const filename = `Certificate_${treeCode}.pdf`;
    try {
      await downloadAndShare(rawPdfUrl, filename, 'application/pdf', token);
    } finally {
      setDownloading(false);
    }
  };

  // Inject PDF data to WebView when it is ready
  const injectPdfData = () => {
    if (!pdfBase64 || !webviewRef.current) return;
    const payload = JSON.stringify({ type: 'load_pdf', base64: pdfBase64 });
    webviewRef.current.postMessage(payload);
  };

  const handleMessage = (e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data && data.type === 'ready') {
        injectPdfData();
      }
    } catch (err) {
      console.warn('[WebView Message Error]:', err);
    }
  };

  // Modern offline-ready HTML5 Canvas PDF reader powered by Mozilla's PDF.js
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <title>Certificate Preview</title>
      <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #0f172a;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #loader {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 14px;
          background-color: #0f172a;
          z-index: 10;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        #viewer {
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        canvas {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div id="loader">
        <div class="spinner"></div>
        <div id="loader-text">Generating preview...</div>
      </div>
      <div id="viewer"></div>

      <script>
        // Send logs to React Native
        function log(msg) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
          }
        }

        // Show visible errors inside WebView
        function showError(msg) {
          var loader = document.getElementById('loader');
          if (loader) {
            loader.innerHTML = '<div style="color:#ef4444;text-align:center;padding:24px;font-weight:bold;font-size:16px;">Failed to generate preview<div style="font-size:12px;color:#94a3b8;margin-top:8px;font-weight:normal;">' + msg + '</div></div>';
          }
        }

        // Catch general page script errors
        window.onerror = function(message, source, lineno, colno, error) {
          log('Window Error: ' + message + ' (' + source + ':' + lineno + ')');
          showError('Page error: ' + message);
          return false;
        };

        // Message listener
        window.addEventListener('message', function(e) {
          log('Received message from React Native');
          var data;
          try {
            data = JSON.parse(e.data);
          } catch (err) {
            log('Failed to parse message data: ' + err.message);
            return;
          }

          if (!data || data.type !== 'load_pdf') return;

          var base64 = data.base64;
          if (!base64) {
            showError('Received empty PDF data.');
            return;
          }

          try {
            if (typeof pdfjsLib === 'undefined') {
              throw new Error('PDF.js library failed to load. Please check your internet connection.');
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

            var binary = atob(base64);
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }

            log('PDF.js: Loading PDF document...');
            pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
              log('PDF.js: Loaded successfully. Total pages: ' + pdf.numPages);
              document.getElementById('loader').style.display = 'none';
              var viewer = document.getElementById('viewer');

              var renderPage = function(pageNum) {
                log('PDF.js: Loading page ' + pageNum);
                pdf.getPage(pageNum).then(function(page) {
                  var viewport = page.getViewport({ scale: 2.0 });
                  var canvas = document.createElement('canvas');
                  var context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  viewer.appendChild(canvas);

                  page.render({
                    canvasContext: context,
                    viewport: viewport
                  }).promise.then(function() {
                    log('PDF.js: Page ' + pageNum + ' render complete');
                    if (pageNum < pdf.numPages) {
                      renderPage(pageNum + 1);
                    }
                  }).catch(function(rerr) {
                    log('PDF.js page render error: ' + rerr.message);
                    showError('Render page error: ' + rerr.message);
                  });
                }).catch(function(perr) {
                  log('PDF.js getPage error: ' + perr.message);
                  showError('Load page error: ' + perr.message);
                });
              };
              renderPage(1);
            }).catch(function(err) {
              log('PDF.js loadDocument error: ' + err.message);
              showError('Parse PDF document error: ' + err.message);
            });
          } catch (err) {
            log('PDF.js script error: ' + err.message);
            showError(err.message);
          }
        });

        // Notify React Native that WebView is ready
        function notifyReady() {
          log('WebView is ready');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          }
        }

        if (window.ReactNativeWebView) {
          notifyReady();
        } else {
          var checkInterval = setInterval(function() {
            if (window.ReactNativeWebView) {
              clearInterval(checkInterval);
              notifyReady();
            }
          }, 50);
        }
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Top Header Navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-lg font-sansBold text-slate-800 font-bold">Certificate</Text>
        </View>

        <TouchableOpacity
          onPress={handleDownload}
          disabled={downloading || !!loadError}
          activeOpacity={0.7}
          className={`p-2 rounded-full border ${
            loadError ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-100'
          }`}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Ionicons name="download-outline" size={20} color={loadError ? '#94a3b8' : '#10b981'} />
          )}
        </TouchableOpacity>
      </View>

      {/* Preview container */}
      <View className="flex-1 bg-[#0f172a] relative">
        {loadError ? (
          <View className="absolute inset-0 items-center justify-center p-6 text-center">
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text className="text-sm font-sansBold text-white font-bold mt-3 mb-1">Failed to load preview</Text>
            <Text className="text-xs font-sans text-slate-400 mb-6 text-center max-w-[260px]">{loadError}</Text>
            <TouchableOpacity
              onPress={handleDownload}
              className="px-5 py-2.5 bg-emerald-500 rounded-xl flex-row items-center gap-2"
            >
              <Ionicons name="download-outline" size={16} color="#ffffff" />
              <Text className="text-xs font-sansBold text-white font-bold">Download Directly</Text>
            </TouchableOpacity>
          </View>
        ) : pdfBase64 && localPdfUri ? (
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={
              Platform.OS === 'ios'
                ? { uri: localPdfUri }
                : { html: htmlContent }
            }
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            onMessage={handleMessage}
            style={{ flex: 1, backgroundColor: '#0f172a' }}
            className="flex-1"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-xs font-sansMedium text-slate-500 mt-3">Fetching certificate...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
