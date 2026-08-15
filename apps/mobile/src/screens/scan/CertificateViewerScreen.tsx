import React, { useState, useEffect } from 'react';
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
import * as Sharing from 'expo-sharing';
// import * as IntentLauncher from 'expo-intent-launcher';
import { API_BASE_URL } from '../../lib/config';
import { useAuth } from '../../lib/AuthContext';
import type { ScanStackParamList } from '../../navigation/types';

type Route = RouteProp<ScanStackParamList, 'CertificateViewer'>;

export default function CertificateViewerScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { treeCode } = route.params;
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rawPdfUrl = `${API_BASE_URL}/scans/${treeCode}/certificate`;

  /** Explicit "Download" action — opens the OS share sheet (save to Files/Drive, send to another app, etc). */
  const shareLocalPdf = async (uri: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Sharing is not available on this device");
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Certificate ${treeCode}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      console.error('[CertViewer Share Error]:', err);
      Alert.alert('Error', (err as Error)?.message || 'Failed to share certificate.');
    }
  };

  /** Explicit "View" action (Android only) — opens the PDF read-only in the device's default
   * viewer via an ACTION_VIEW intent, distinct from the Download/Share action above. Doesn't
   * save/export anything on its own; that's what the Download button is for. */
  const viewLocalPdfAndroid = async (uri: string) => {
    try {
      const IntentLauncher = require('expo-intent-launcher');
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
    } catch (err) {
      console.error('[CertViewer View Error]:', err);
      await shareLocalPdf(uri);
    }
  };

  const fetchPdf = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const localUri = `${FileSystem.cacheDirectory}Certificate_${treeCode}.pdf`;
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

      setLocalPdfUri(downloadResult.uri);
    } catch (err) {
      console.error('[CertViewer Fetch Error]:', err);
      setLoadError((err as Error)?.message || 'Failed to retrieve certificate.');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF locally on mount
  useEffect(() => {
    fetchPdf();
  }, [treeCode, token]);

  const handleDownload = async () => {
    if (localPdfUri) {
      await shareLocalPdf(localPdfUri);
    }
  };

  const handleView = async () => {
    if (localPdfUri) {
      await viewLocalPdfAndroid(localPdfUri);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      {/* Top Header Navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
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

        {localPdfUri && (
          <TouchableOpacity
            onPress={handleDownload}
            activeOpacity={0.7}
            className="p-2 rounded-full border bg-emerald-50 border-emerald-100"
          >
            <Ionicons name="share-outline" size={20} color="#10b981" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area */}
      <View className="flex-1 bg-slate-100">
        {loading ? (
          <View className="flex-1 items-center justify-center p-6">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-sm font-sansMedium text-slate-500 mt-4 text-center">
              Loading certificate...
            </Text>
          </View>
        ) : loadError ? (
          <View className="flex-1 items-center justify-center p-6 text-center">
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text className="text-base font-sansBold text-slate-800 font-bold mt-4 mb-2">
              Failed to load certificate
            </Text>
            <Text className="text-sm font-sans text-slate-500 mb-6 text-center max-w-[280px]">
              {loadError}
            </Text>
            <TouchableOpacity
              onPress={fetchPdf}
              activeOpacity={0.8}
              className="px-6 py-3 bg-emerald-500 rounded-xl flex-row items-center gap-2"
            >
              <Ionicons name="refresh-outline" size={18} color="#ffffff" />
              <Text className="text-sm font-sansBold text-white font-bold">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS === 'ios' && localPdfUri ? (
          <WebView
            originWhitelist={['*']}
            source={{ uri: localPdfUri }}
            allowFileAccess={true}
            style={{ flex: 1 }}
            className="flex-1"
          />
        ) : (
          /* Android — no PDF renderer available in-app, so offer explicit
             View (opens read-only in the device's default viewer) and
             Download (share sheet) actions. Neither fires automatically. */
          <View className="flex-1 items-center justify-center p-6">
            <View className="w-16 h-16 bg-emerald-100 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={36} color="#10b981" />
            </View>
            <Text className="text-lg font-sansBold text-slate-800 font-bold text-center mb-2">
              Certificate Ready
            </Text>
            <Text className="text-sm font-sans text-slate-500 text-center mb-8 max-w-[285px]">
              View the certificate, or download it to save or share it.
            </Text>
            <TouchableOpacity
              onPress={handleView}
              activeOpacity={0.8}
              className="w-full max-w-[260px] py-3.5 bg-emerald-500 rounded-xl flex-row items-center justify-center gap-2 mb-3"
            >
              <Ionicons name="eye-outline" size={20} color="#ffffff" />
              <Text className="text-base font-sansBold text-white font-bold">View Certificate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDownload}
              activeOpacity={0.8}
              className="w-full max-w-[260px] py-3.5 bg-white border border-emerald-200 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Ionicons name="download-outline" size={20} color="#10b981" />
              <Text className="text-base font-sansBold text-emerald-600 font-bold">Download</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
