import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

let VoraAr: any = null;

// Only attempt to load native AR module on Android
if (Platform.OS === 'android') {
  try {
    VoraAr = requireNativeModule('VoraAr');
  } catch (e) {
    console.warn('[VoraAr] Native module VoraAr not available on this Android build:', e);
    VoraAr = null;
  }
}

export interface PoseStats {
  posesWritten: number;
  videoPath: string;
  posesPath: string;
}

export function startCapture(videoPath: string): void {
  if (Platform.OS !== 'android' || !VoraAr) {
    console.log('[VoraAr] startCapture skipped (non-Android or module unavailable).');
    return;
  }
  try {
    VoraAr.startCapture(videoPath);
  } catch (err) {
    console.warn('[VoraAr] Error starting capture:', err);
  }
}

export function recordPose(): void {
  if (Platform.OS !== 'android' || !VoraAr) {
    return;
  }
  try {
    VoraAr.recordPose();
  } catch (err) {
    // Ignore frame recording errors
  }
}

export function stopCapture(posesPath: string): PoseStats {
  if (Platform.OS !== 'android' || !VoraAr) {
    console.log('[VoraAr] stopCapture fallback (non-Android).');
    return {
      posesWritten: 0,
      videoPath: '',
      posesPath: '',
    };
  }
  try {
    return VoraAr.stopCapture(posesPath);
  } catch (err) {
    console.warn('[VoraAr] Error stopping capture:', err);
    return {
      posesWritten: 0,
      videoPath: '',
      posesPath: '',
    };
  }
}

export async function isSupported(): Promise<boolean> {
  if (Platform.OS !== 'android' || !VoraAr) {
    return false;
  }
  try {
    return !!(await VoraAr.isSupported());
  } catch {
    return false;
  }
}
