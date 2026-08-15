import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  TextInput,
  Switch,
  StyleSheet,
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
import VoraButton from '../../components/VoraButton';

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
  const [micPermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [treeCode, setTreeCode] = useState('');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [frames, setFrames] = useState(25);
  const [blurThresh, setBlurThresh] = useState(80);
  const [video, setVideo] = useState<VideoSource | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);

  // ARCore VIO state & refs
  const [arSupported, setArSupported] = useState(false);
  const [posesPath, setPosesPath] = useState<string | null>(null);
  const poseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    try {
      const voraAr = require('vora-ar');
      if (typeof voraAr.isSupported === 'function') {
        const supported = voraAr.isSupported();
        setArSupported(supported);
        console.log(`[ScanCaptureScreen] ARCore VIO support detected: ${supported}`);
      }
    } catch (e) {
      console.log('[ScanCaptureScreen] VoraAr native module not available or not supported on this device/platform.');
      setArSupported(false);
    }
  }, []);

  const pickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const file = result.assets[0];
        if (file.size && file.size > 150 * 1024 * 1024) {
          Alert.alert(
            'Video File Too Large',
            `Selected video is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 150MB. Please select a 15–30s video.`
          );
          return;
        }
        setVideo({
          uri: file.uri,
          name: file.name || 'tree_scan.mp4',
          mimeType: file.mimeType || 'video/mp4',
        });
        setErrorMessage(null);
        setPosesPath(null); // Clear poses since it's an uploaded file
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
      await requestMicrophonePermission();
    }
    setStage('camera');
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setPosesPath(null);

    let activePosesPath: string | null = null;
    if (arSupported) {
      try {
        const voraAr = require('vora-ar');
        const FileSystem = require('expo-file-system');
        const tempVideoPath = `${FileSystem.cacheDirectory}ar_temp_${Date.now()}.mp4`;
        const tempPosesPath = `${FileSystem.cacheDirectory}poses_${Date.now()}.json`;
        activePosesPath = tempPosesPath;

        // Start native ARCore session + MediaRecorder
        voraAr.startCapture(tempVideoPath);

        // Sample VIO pose every 100ms
        poseIntervalRef.current = setInterval(() => {
          voraAr.recordPose();
        }, 100);
        console.log('[ScanCaptureScreen] ARCore VIO tracking session started in background');
      } catch (err) {
        console.error('[ScanCaptureScreen] Failed to start ARCore tracking session:', err);
      }
    }

    try {
      const result = await cameraRef.current.recordAsync();
      if (result?.uri) {
        setVideo({ uri: result.uri, name: 'tree_scan.mp4', mimeType: 'video/mp4' });
        if (activePosesPath) {
          setPosesPath(activePosesPath);
          console.log(`[ScanCaptureScreen] Video recorded, associated with VIO poses at: ${activePosesPath}`);
        }
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
    if (poseIntervalRef.current) {
      clearInterval(poseIntervalRef.current);
      poseIntervalRef.current = null;
    }
    if (arSupported) {
      try {
        const voraAr = require('vora-ar');
        const FileSystem = require('expo-file-system');
        const tempPosesPath = posesPath || `${FileSystem.cacheDirectory}poses_latest.json`;
        const stats = voraAr.stopCapture(tempPosesPath);
        console.log(`[ScanCaptureScreen] ARCore session stopped. Recorded ${stats.posesWritten} poses.`);
      } catch (err) {
        console.error('[ScanCaptureScreen] Failed to stop ARCore tracking session:', err);
      }
    }
    cameraRef.current?.stopRecording();
  };

  const startScan = async () => {
    if (!video) {
      Alert.alert('No Video Selected', 'Record or choose a tree scan video first.');
      return;
    }

    setErrorMessage(null);
    setUploadProgress(null);
    setStage('uploading');
    try {
      await uploadVideoToBackend(video, {
        frames,
        blurThresh,
        posesPath: posesPath || undefined,
        onProgress: (loaded, total) => setUploadProgress({ loaded, total }),
      });
      setUploadProgress(null);

      setStage('extracting');
      const status = await pollPipelineStatus(client, {
        intervalMs: 1500,
        maxAttempts: 300,
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
      setUploadProgress(null);
      setErrorMessage((err as Error)?.message || 'Something went wrong while starting the scan.');
    }
  };

  if (stage === 'camera') {
    const CustomCameraView = CameraView as any;
    return (
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
        <CustomCameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="video" facing="back" />
        <SafeAreaView className="flex-1 justify-between">
          <View className="flex-row items-center p-4 gap-3 bg-black/30">
            <TouchableOpacity 
              onPress={() => setStage('form')} 
              className="w-9 h-9 rounded-full bg-black/50 justify-center items-center"
            >
              <Text className="color-white text-base font-bold">✕</Text>
            </TouchableOpacity>
            <Text className="color-white text-xs flex-1">Walk slowly around the trunk, keep it centered</Text>
            {arSupported && (
              <View className="flex-row items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Text className="text-[9px] font-sansBold text-emerald-400 tracking-wider">AR VIO</Text>
              </View>
            )}
          </View>
          <View className="items-center pb-10">
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              className={`w-[74px] h-[74px] rounded-full border-4 border-white justify-center items-center ${isRecording ? 'border-red-600' : ''}`}
            >
              {isRecording ? (
                <View className="w-7 h-7 rounded bg-red-600" />
              ) : (
                <View className="w-14 h-14 rounded-full bg-red-600" />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isBusy = stage === 'uploading' || stage === 'extracting';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView 
        className="flex-1 bg-slate-50/60"
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6 mt-2">
          <Text className="font-serif text-3xl text-vora-dark mb-1">New reconstruction</Text>
          <Text className="text-xs text-slate-500 font-sans leading-relaxed">
            Record or upload a video walkthrough to start the 3D pipeline.
          </Text>
        </View>

        {/* Outer Form Card */}
        <View className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          
          {/* Tree code input */}
          <View className="flex-col mb-5">
            <Text className="text-[10px] font-sansBold uppercase tracking-wider text-slate-400 mb-1.5">
              Tree identifier <Text className="normal-case tracking-normal font-normal text-slate-300">(optional)</Text>
            </Text>
            <TextInput
              className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-sansMedium text-slate-900 focus:border-slate-400"
              placeholder="e.g. POHON-0042"
              placeholderTextColor="#9ca3af"
              value={treeCode}
              onChangeText={setTreeCode}
              autoCapitalize="characters"
              editable={!isBusy}
            />
          </View>

          {/* Remove background checkbox-style row */}
          <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-5">
            <View className="flex-col flex-1 pr-4">
              <Text className="text-xs font-sansBold text-vora-dark mb-0.5">Remove Background</Text>
              <Text className="text-[10px] text-slate-400 leading-normal">
                Isolate the tree and remove background objects for a clean 3D visualization.
              </Text>
            </View>
            <Switch
              value={removeBackground}
              onValueChange={setRemoveBackground}
              disabled={isBusy}
              trackColor={{ false: '#cbd5e1', true: '#141417' }}
              thumbColor={removeBackground ? '#ffffff' : '#f4f3f3'}
            />
          </View>

          {/* Video file sources */}
          <View className="flex-col mb-5">
            <Text className="text-[10px] font-sansBold uppercase tracking-wider text-slate-400 mb-1.5">Video walkthrough</Text>
            
            {!video ? (
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 bg-slate-50 border border-slate-200/80 border-dashed rounded-xl p-4 items-center justify-center active:bg-slate-100/50"
                  onPress={openCamera}
                  disabled={isBusy}
                >
                  <Text className="text-2xl mb-1">📸</Text>
                  <Text className="text-[11px] font-sansBold text-slate-700">Record Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-1 bg-slate-50 border border-slate-200/80 border-dashed rounded-xl p-4 items-center justify-center active:bg-slate-100/50"
                  onPress={pickVideoFile}
                  disabled={isBusy}
                >
                  <Text className="text-2xl mb-1">📁</Text>
                  <Text className="text-[11px] font-sansBold text-slate-700">Choose File</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <Text className="text-lg mr-2">🎥</Text>
                  <View className="flex-col flex-1">
                    <Text className="text-[9px] font-sansBold text-emerald-800 uppercase tracking-wide">Selected Video</Text>
                    <Text className="text-xs font-sansMedium text-emerald-950" numberOfLines={1}>{video.name}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => setVideo(null)} 
                  disabled={isBusy}
                  className="p-1 rounded-full bg-emerald-100/50"
                >
                  <Text className="text-[11px] font-sansBold text-emerald-850 px-1 font-bold">Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Steppers */}
          <Stepper
            label="Frames to extract"
            value={frames}
            min={FRAMES_MIN}
            max={FRAMES_MAX}
            step={FRAMES_STEP}
            onChange={setFrames}
            disabled={isBusy}
          />

          <Stepper
            label="Blur filter threshold"
            value={blurThresh}
            min={BLUR_MIN}
            max={BLUR_MAX}
            step={BLUR_STEP}
            onChange={setBlurThresh}
            disabled={isBusy}
          />

          {/* Start Scan button */}
          <VoraButton
            title={isBusy ? (stage === 'uploading' ? 'Uploading Video...' : 'Extracting Frames...') : 'Start Scan'}
            onPress={startScan}
            isLoading={isBusy}
            disabled={!video || isBusy}
            variant="primary"
            className="mt-4"
          />

          {/* Upload progress bar */}
          {stage === 'uploading' && uploadProgress && uploadProgress.total > 0 && (
            <View className="mt-3">
              <View className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <View
                  className="h-full bg-vora-green rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((uploadProgress.loaded / uploadProgress.total) * 100))}%`,
                  }}
                />
              </View>
              <Text className="text-[10px] font-sansMedium text-slate-400 mt-1 text-right">
                {Math.min(100, Math.round((uploadProgress.loaded / uploadProgress.total) * 100))}%
              </Text>
            </View>
          )}
        </View>

        {/* Error box */}
        {errorMessage && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-5 flex-col">
            <Text className="text-xs font-sansBold text-red-800 mb-0.5 font-bold">⚠️ Scan Failed</Text>
            <Text className="text-xs font-sans text-red-750 leading-relaxed">{errorMessage}</Text>
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
    <View className="mb-5 flex-row items-center justify-between">
      <View className="flex-col">
        <Text className="text-[10px] font-sansBold uppercase tracking-wider text-slate-400 font-bold">{label}</Text>
        <Text className="text-sm font-sansBold text-vora-dark mt-0.5 font-bold">{value}</Text>
      </View>
      <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
        <TouchableOpacity
          className={`w-9 h-9 rounded-lg justify-center items-center ${value <= min || disabled ? 'opacity-40' : 'active:bg-slate-200'}`}
          disabled={disabled || value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text className="text-base font-sansBold text-slate-800 font-bold">−</Text>
        </TouchableOpacity>
        
        <View className="w-10 items-center justify-center">
          <Text className="text-xs font-sansBold text-slate-900 font-bold">{value}</Text>
        </View>

        <TouchableOpacity
          className={`w-9 h-9 rounded-lg justify-center items-center ${value >= max || disabled ? 'opacity-40' : 'active:bg-slate-200'}`}
          disabled={disabled || value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text className="text-base font-sansBold text-slate-800 font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
