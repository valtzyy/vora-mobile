import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pollPipelineStatus } from '@vora/api-client';
import type { ScanStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { uploadVideoToBackend, type VideoSource } from '../../lib/videoUpload';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanCapture'>;

type Stage = 'form' | 'camera' | 'uploading' | 'extracting';

const FRAMES_MIN = 10;
const FRAMES_MAX = 100;
const FRAMES_STEP = 5;
const BLUR_MIN = 10;
const BLUR_MAX = 200;
const BLUR_STEP = 10;

export default function ScanCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const cameraRef = useRef<CameraView>(null);

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [treeCode, setTreeCode] = useState('');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [frames, setFrames] = useState(25);
  const [blurThresh, setBlurThresh] = useState(80);
  const [video, setVideo] = useState<VideoSource | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const file = result.assets[0];
        setVideo({
          uri: file.uri,
          name: file.name || 'tree_scan.mp4',
          mimeType: file.mimeType || 'video/mp4',
        });
        setErrorMessage(null);
      }
    } catch (err) {
      console.error('Pick video error:', err);
      Alert.alert('Error', 'Failed to pick video file from device.');
    }
  };

  const openCamera = async () => {
    if (!camPermission?.granted) {
      const res = await requestCamPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission Needed', 'Enable camera access to record a scan video.');
        return;
      }
    }
    if (!micPermission?.granted) {
      await requestMicPermission();
      // Audio is not required for the scan itself — proceed even if denied.
    }
    setStage('camera');
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    try {
      const result = await cameraRef.current.recordAsync();
      if (result?.uri) {
        setVideo({ uri: result.uri, name: 'tree_scan.mp4', mimeType: 'video/mp4' });
      }
    } catch (err) {
      console.error('Camera recording error:', err);
      Alert.alert('Recording Failed', 'Could not record video. Please try again or pick a file instead.');
    } finally {
      setIsRecording(false);
      setStage('form');
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const startScan = async () => {
    if (!video) {
      Alert.alert('No Video Selected', 'Record or choose a tree scan video first.');
      return;
    }

    setErrorMessage(null);
    setStage('uploading');
    try {
      await uploadVideoToBackend(video, { frames, blurThresh });

      setStage('extracting');
      const status = await pollPipelineStatus(client, {
        intervalMs: 1500,
        maxAttempts: 300, // 300 * 1.5s = 7.5 min
        stopCondition: (s) => s.stage === 'extracted' || s.stage === 'error',
      });

      if (status.stage === 'error') {
        throw new Error(status.error || 'Frame extraction failed on the server.');
      }

      navigation.navigate('ScanMarking', {
        treeCode: treeCode.trim() || undefined,
        removeBackground,
      });
      setStage('form');
    } catch (err) {
      console.error('Scan start error:', err);
      setStage('form');
      setErrorMessage((err as Error)?.message || 'Something went wrong while starting the scan.');
    }
  };

  if (stage === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="video" facing="back" />
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.cameraTopBar}>
            <TouchableOpacity onPress={() => setStage('form')} style={styles.cameraCloseButton}>
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.cameraHint}>Walk slowly around the trunk, keep it centered</Text>
          </View>
          <View style={styles.cameraBottomBar}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            >
              {isRecording ? <View style={styles.recordStopIcon} /> : <View style={styles.recordDotIcon} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isBusy = stage === 'uploading' || stage === 'extracting';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>New Tree Scan</Text>
          <Text style={styles.subtitle}>
            Record or upload a video walking around a tree trunk to reconstruct it in 3D and estimate its carbon.
          </Text>
        </View>

        {/* Video source */}
        <View style={styles.sourceRow}>
          <TouchableOpacity style={styles.sourceButton} onPress={openCamera} disabled={isBusy}>
            <Text style={styles.sourceIcon}>📷</Text>
            <Text style={styles.sourceLabel}>Record with Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sourceButton} onPress={pickVideoFile} disabled={isBusy}>
            <Text style={styles.sourceIcon}>📁</Text>
            <Text style={styles.sourceLabel}>Choose from Files</Text>
          </TouchableOpacity>
        </View>

        {video && (
          <View style={styles.fileCard}>
            <Text style={styles.fileCardTitle}>Selected Video</Text>
            <Text style={styles.fileName} numberOfLines={1}>{video.name}</Text>
          </View>
        )}

        {/* Tree code */}
        <Text style={styles.fieldLabel}>Tree Code (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. POHON-1234 — leave blank to auto-generate"
          placeholderTextColor="#9ca3af"
          value={treeCode}
          onChangeText={setTreeCode}
          autoCapitalize="characters"
          editable={!isBusy}
        />

        {/* Remove background */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Remove Background</Text>
            <Text style={styles.fieldHint}>Segment out the background before reconstruction (rembg)</Text>
          </View>
          <Switch value={removeBackground} onValueChange={setRemoveBackground} disabled={isBusy} />
        </View>

        {/* Frames stepper */}
        <Stepper
          label="Frames to extract"
          value={frames}
          min={FRAMES_MIN}
          max={FRAMES_MAX}
          step={FRAMES_STEP}
          onChange={setFrames}
          disabled={isBusy}
        />

        {/* Blur threshold stepper */}
        <Stepper
          label="Blur threshold"
          value={blurThresh}
          min={BLUR_MIN}
          max={BLUR_MAX}
          step={BLUR_STEP}
          onChange={setBlurThresh}
          disabled={isBusy}
        />

        <TouchableOpacity
          style={[styles.primaryButton, (!video || isBusy) && styles.buttonDisabled]}
          onPress={startScan}
          disabled={!video || isBusy}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.primaryButtonText}>
                {stage === 'uploading' ? 'Uploading Video...' : 'Extracting Frames...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Start Scan</Text>
          )}
        </TouchableOpacity>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Scan Failed</Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperButton}
          disabled={disabled || value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={styles.stepperButton}
          disabled={disabled || value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22 },
  sourceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  sourceButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  sourceIcon: { fontSize: 32, marginBottom: 8 },
  sourceLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  fileCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  fileCardTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', marginBottom: 4 },
  fileName: { fontSize: 15, fontWeight: '600', color: '#1e3a8a' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepperRow: { marginBottom: 20 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: { fontSize: 20, fontWeight: '700', color: '#374151' },
  stepperValue: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 40, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#9ca3af', opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorTitle: { fontSize: 15, fontWeight: 'bold', color: '#991b1b', marginBottom: 4 },
  errorDescription: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  // Camera overlay
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cameraCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCloseText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cameraHint: { color: '#ffffff', fontSize: 13, flex: 1 },
  cameraBottomBar: { alignItems: 'center', paddingBottom: 40 },
  recordButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: { borderColor: '#dc2626' },
  recordDotIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dc2626' },
  recordStopIcon: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#dc2626' },
});
