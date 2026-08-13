import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
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
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const rawPdfUrl = `${API_BASE_URL}/scans/${treeCode}/certificate`;
  // Append token to URL so the viewer can retrieve the PDF if authorized
  const authenticatedPdfUrl = `${rawPdfUrl}?token=${token || ''}`;

  // Android WebView doesn't render PDF files natively, so we pass it through Google Docs Viewer
  const webviewUrl = Platform.OS === 'android'
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(authenticatedPdfUrl)}`
    : authenticatedPdfUrl;

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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header top bar */}
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
          disabled={downloading}
          activeOpacity={0.7}
          className="p-2 bg-emerald-50 rounded-full border border-emerald-100"
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Ionicons name="download-outline" size={20} color="#10b981" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main viewer body */}
      <View className="flex-1 bg-slate-50 relative">
        <WebView
          source={{ uri: webviewUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            Alert.alert(
              "Viewer Error",
              "Unable to load document viewer. You can still download the certificate directly.",
              [{ text: "Download", onPress: handleDownload }, { text: "Cancel" }]
            );
          }}
          style={{ flex: 1 }}
          className="flex-1"
        />

        {loading && (
          <View className="absolute inset-0 bg-slate-50/80 items-center justify-center">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-xs font-sansMedium text-slate-500 mt-3">Loading certificate...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
