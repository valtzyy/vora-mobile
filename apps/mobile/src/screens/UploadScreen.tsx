import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { uploadScan } from '../lib/api';

const MAX_FILE_SIZE_MB = 150;

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: any) => uploadScan(file),
    onSuccess: (data) => {
      // Navigate to result screen with jobId
      navigation.navigate('ScanResult', { jobId: data.job_id });
    },
    onError: (error: any) => {
      Alert.alert(
        'Upload Failed',
        error?.message || 'Could not upload video. Please check your connection and retry.',
        [{ text: 'OK' }]
      );
    },
  });

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // File size validation
        if (file.size && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          Alert.alert(
            'File Too Large',
            `The selected video is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`
          );
          return;
        }

        setSelectedFile(file);
        // Clear previous errors if any
        if (uploadMutation.isError) {
          uploadMutation.reset();
        }
      }
    } catch (err) {
      console.error('Pick video error:', err);
      Alert.alert('Error', 'Failed to pick video file from device.');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      Alert.alert('No Video Selected', 'Please choose a tree scan video file first.');
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    if (uploadMutation.isError) {
      uploadMutation.reset();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>New Tree Scan</Text>
          <Text style={styles.subtitle}>
            Upload a 360° video around a tree trunk to reconstruct 3D splats and estimate carbon biomass.
          </Text>
        </View>

        {/* Video Upload Area / Dropzone */}
        <TouchableOpacity
          style={[
            styles.dropzone,
            selectedFile ? styles.dropzoneActive : null,
            uploadMutation.isPending ? styles.dropzoneDisabled : null,
          ]}
          activeOpacity={0.8}
          onPress={pickVideo}
          disabled={uploadMutation.isPending}
        >
          <Text style={styles.dropzoneIcon}>{selectedFile ? '🎬' : '📹'}</Text>
          <Text style={styles.dropzoneTitle}>
            {selectedFile ? 'Video Ready for Processing' : 'Select Tree Video'}
          </Text>
          <Text style={styles.dropzoneHint}>
            {selectedFile ? 'Tap to choose a different video' : `Supports MP4, MOV (max ${MAX_FILE_SIZE_MB} MB)`}
          </Text>
        </TouchableOpacity>

        {/* Selected File Details */}
        {selectedFile && (
          <View style={styles.fileCard}>
            <View style={styles.fileCardHeader}>
              <Text style={styles.fileCardTitle}>Selected File</Text>
              {!uploadMutation.isPending && (
                <TouchableOpacity onPress={handleClearSelection}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name || 'tree_scan.mp4'}
            </Text>
            {selectedFile.size ? (
              <Text style={styles.fileSize}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            ) : null}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!selectedFile || uploadMutation.isPending) ? styles.buttonDisabled : null,
            ]}
            onPress={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            activeOpacity={0.8}
          >
            {uploadMutation.isPending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.loadingButtonText}>Uploading Video...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Upload & Process</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              uploadMutation.isPending ? styles.buttonDisabled : null,
            ]}
            onPress={pickVideo}
            disabled={uploadMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {selectedFile ? 'Change Video File' : 'Browse Gallery Files'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Feedback */}
        {uploadMutation.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Upload Failed</Text>
            <Text style={styles.errorDescription}>
              {(uploadMutation.error as Error)?.message || 'Something went wrong during video upload.'}
            </Text>
            <TouchableOpacity
              style={styles.retryUploadButton}
              onPress={handleUpload}
              activeOpacity={0.8}
            >
              <Text style={styles.retryUploadText}>Retry Upload</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  dropzone: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  dropzoneActive: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  dropzoneDisabled: {
    opacity: 0.6,
  },
  dropzoneIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  dropzoneTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  dropzoneHint: {
    fontSize: 13,
    color: '#9ca3af',
  },
  fileCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  fileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fileCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  removeText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    color: '#3b82f6',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 4,
  },
  errorDescription: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
    marginBottom: 10,
  },
  retryUploadButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  retryUploadText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
