import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { pollPipelineStatus, fetchHistoryWithRetry } from '@vora/api-client';
import { getPipelineStageInfo } from '@vora/domain';
import type { PipelineStatus } from '@vora/types';
import type { ScanStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { API_BASE_URL } from '../../lib/config';
import { notifyScanComplete } from '../../lib/notifications';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanProcessing'>;
type Route = RouteProp<ScanStackParamList, 'ScanProcessing'>;

const STAGES = ['extracting', 'extracted', 'reconstructing', 'done'] as const;
const MAX_TIMEOUT_SEC = 210;

export default function ScanProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { treeCode } = route.params;

  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      try {
        const finalStatus = await pollPipelineStatus(client, {
          treeCode,
          intervalMs: 3000,
          maxAttempts: 240, // 240 * 3s = 12 min
          stopCondition: (s) => (s.stage === 'done' && (s.tree_code === treeCode || !s.tree_code)) || s.stage === 'error',
          onUpdate: (s) => {
            if (!cancelledRef.current) setStatus(s);
          },
        });

        if (cancelledRef.current) return;

        if (finalStatus.stage === 'error') {
          setErrorMessage(finalStatus.error || 'Reconstruction failed on the server.');
          return;
        }

        await fetchHistoryWithRetry(client, treeCode);
        if (!cancelledRef.current) {
          // New scan is now saved server-side — Dashboard/Gallery lists are
          // cached, so mark them stale now instead of waiting for the next
          // focus event to catch up.
          queryClient.invalidateQueries({ queryKey: ['scans'] });
          notifyScanComplete(treeCode);
          navigation.replace('ScanResult', { treeCode });
        }
      } catch (err) {
        if (!cancelledRef.current) {
          setErrorMessage((err as Error)?.message || 'Lost connection while processing the scan.');
        }
      }
    })();

    return () => {
      // Non-destructive navigation: unmounting screen does NOT cancel remote job
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeCode]);

  useEffect(() => {
    if (!status?.started_at) return;
    const tick = () => {
      const sec = Math.max(0, Math.floor(Date.now() / 1000 - status.started_at!));
      setElapsedSec(sec);
      if (sec > MAX_TIMEOUT_SEC && status?.stage === 'reconstructing') {
        setIsTimedOut(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.started_at, status?.stage]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Reconstruction?',
      'Are you sure you want to abort this 3D reconstruction scan?',
      [
        { text: 'Keep Scanning', style: 'cancel' },
        {
          text: 'Cancel Scan',
          style: 'destructive',
          onPress: async () => {
            cancelledRef.current = true;
            try {
              await client.pipeline.cancelJob();
            } catch {}
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleMinimize = () => {
    // Navigate back to Dashboard without cancelling the background scan
    navigation.navigate('ScanCapture');
  };

  const stageInfo = getPipelineStageInfo(status?.stage ?? 'reconstructing', status?.message);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');

  if (isTimedOut) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={[styles.errorIconCircle, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.errorIconText}>⏱️</Text>
          </View>
          <Text style={[styles.errorTitle, { color: '#b45309' }]}>Processing Timeout (210s)</Text>
          <Text style={styles.errorSubtitle}>
            Reconstruction is taking longer than usual (over 3.5 minutes). The cloud GPU may be in a temporary queue delay.
          </Text>
          <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.primaryButton, { minHeight: 48 }]}
              onPress={() => navigation.popToTop()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Retry Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { minHeight: 48 }]}
              onPress={() => navigation.navigate('ScanCapture')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Processing Failed</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { minHeight: 48, width: '100%' }]}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Back to Scan Setup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: `${API_BASE_URL}/frames/${treeCode}/0000.jpg` }}
          defaultSource={{ uri: `${API_BASE_URL}/frames/0000.jpg` }}
          style={styles.previewImage}
          resizeMode="cover"
        />

        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 24 }} />
        <Text style={styles.stageLabel}>{stageInfo.label}</Text>
        <Text style={styles.stageDescription}>{stageInfo.description}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stageInfo.progressPct}%` }]} />
        </View>

        <Text style={styles.elapsedText}>Elapsed: {mm}:{ss}</Text>

        <View style={styles.checklistBox}>
          {STAGES.map((s) => {
            const currentIndex = STAGES.indexOf((status?.stage as (typeof STAGES)[number]) ?? 'extracting');
            const stepIndex = STAGES.indexOf(s);
            const isDone = stepIndex < currentIndex || status?.stage === 'done';
            const isCurrent = s === status?.stage;
            const KeyedView = View as any;
            return (
              <KeyedView key={s} style={styles.checklistRow}>
                <Text style={styles.checklistIcon}>{isDone ? '✓' : isCurrent ? '●' : '○'}</Text>
                <Text style={[styles.checklistText, (isDone || isCurrent) && styles.checklistTextActive]}>
                  {getPipelineStageInfo(s).label}
                </Text>
              </KeyedView>
            );
          })}
        </View>

        <View style={styles.treeCodeBadge}>
          <Text style={styles.treeCodeLabel}>TREE CODE:</Text>
          <Text style={styles.treeCodeText}>{treeCode}</Text>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { flex: 1, minHeight: 48 }]}
            onPress={handleMinimize}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Run in Background</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { minHeight: 48 }]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 24, alignItems: 'center' },
  previewImage: { width: '100%', height: 160, borderRadius: 16, backgroundColor: '#e5e7eb' },
  stageLabel: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 16, textAlign: 'center' },
  stageDescription: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center', lineHeight: 18 },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 4 },
  elapsedText: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  checklistBox: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checklistIcon: { fontSize: 14, color: '#9ca3af', width: 18 },
  checklistText: { fontSize: 13, color: '#9ca3af' },
  checklistTextActive: { color: '#166534', fontWeight: '600' },
  treeCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 16,
  },
  treeCodeLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  treeCodeText: { fontSize: 12, color: '#1f2937', fontFamily: 'monospace', fontWeight: '600' },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  cancelButtonText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#ffffff' },
  stateCard: { alignItems: 'center', width: '100%', maxWidth: 340 },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: { fontSize: 28 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#dc2626', marginBottom: 8, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: { color: '#374151', fontSize: 13, fontWeight: '600' },
});
