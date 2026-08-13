import { requireNativeModule } from 'expo';

const VoraAr = requireNativeModule('VoraAr');

export interface PoseStats {
  posesWritten: number;
  videoPath: string;
  posesPath: string;
}

export function startCapture(videoPath: string): void {
  VoraAr.startCapture(videoPath);
}

export function recordPose(): void {
  VoraAr.recordPose();
}

export function stopCapture(posesPath: string): PoseStats {
  return VoraAr.stopCapture(posesPath);
}

export function isSupported(): boolean {
  return VoraAr.isSupported();
}
