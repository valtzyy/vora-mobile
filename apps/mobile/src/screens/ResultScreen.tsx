import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchScanResult } from '../lib/api';
import { Scan } from '../types';

export default function ResultScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const jobId = route.params?.jobId;
  const initialScanData: Scan | undefined = route.params?.scanData;

  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['scan-result', jobId],
    queryFn: () => fetchScanResult(jobId),
    enabled: !!jobId && !initialScanData,
    refetchInterval: (query: any) => {
      const data = query?.state?.data || query;
      const scan = data?.result || data;
      // Stop polling once scan data with valid id is available
      return scan?.id ? false : 3000;
    },
    retry: 2,
  });

  // Extract scan data
  const scan: Scan | undefined =
    initialScanData ||
    (rawData?.result ? rawData.result : rawData?.id ? rawData : undefined);

  const isProcessing =
    (isLoading && !scan) || (rawData?.status === 'processing' && !scan);

  // 1. Invalid Job ID State
  if (!jobId && !initialScanData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>❓</Text>
          </View>
          <Text style={styles.errorTitle}>Invalid Scan Reference</Text>
          <Text style={styles.errorSubtitle}>
            No Job ID or Scan Data was provided to display results.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Upload', { screen: 'UploadForm' })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start a New Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Processing / Polling State
  if (isProcessing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingTitle}>Processing 3D Tree Scan</Text>
          <Text style={styles.loadingSubtitle}>
            Our AI engine is reconstructing trunk geometry, segmenting diameter, and computing allometric carbon storage.
          </Text>

          <View style={styles.processStepsBox}>
            <Text style={styles.processStepItem}>⚡ 1. Frame Extraction & SfM Alignment</Text>
            <Text style={styles.processStepItem}>🌱 2. 3D Gaussian Splatting</Text>
            <Text style={styles.processStepItem}>📐 3. DBH & Allometric Biomass Extraction</Text>
          </View>

          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeLabel}>JOB ID:</Text>
            <Text style={styles.jobBadgeText}>{jobId}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Error State
  if (isError && !scan) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Processing Failed</Text>
          <Text style={styles.errorSubtitle}>
            {(error as Error)?.message || 'We could not complete the 3D reconstruction for this video.'}
          </Text>
          <View style={styles.serverInfoBox}>
            <Text style={styles.serverInfoLabel}>Job ID:</Text>
            <Text style={styles.serverInfoValue}>{jobId}</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, isRefetching ? styles.buttonDisabled : null]}
            onPress={() => refetch()}
            disabled={isRefetching}
            activeOpacity={0.8}
          >
            {isRefetching ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.primaryButtonText}>Checking Job...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Retry Polling</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Upload', { screen: 'UploadForm' })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Back to Upload</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Missing Data Fallback
  if (!scan) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No Scan Metrics</Text>
          <Text style={styles.emptySubtitle}>
            The server reported the job finished but returned no numerical metrics.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Upload', { screen: 'UploadForm' })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Try Another Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 5. Success State
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#16a34a']}
            tintColor="#ffffff"
          />
        }
      >
        {/* Header Hero */}
        <View style={styles.heroHeader}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>✓ 3D Scan Complete</Text>
          </View>
          <Text style={styles.heroTitle}>Carbon Metrics</Text>
          <Text style={styles.heroDate}>
            {new Date(scan.created_at || Date.now()).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.body}>
          {/* Tree Image Preview (Step 7) */}
          {scan.image_url && (
            <Image
              source={{ uri: scan.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}

          {/* Carbon Highlight Card */}
          <View style={[styles.carbonCard, !scan.image_url ? styles.carbonCardOverlap : null]}>
            <Text style={styles.carbonLabel}>Estimated Carbon Stored</Text>
            <View style={styles.carbonValueRow}>
              <Text style={styles.carbonValue}>
                {typeof scan.co2e === 'number' ? scan.co2e.toFixed(1) : scan.co2e}
              </Text>
              <Text style={styles.carbonUnit}>kg CO₂e</Text>
            </View>
            <Text style={styles.carbonHint}>
              Equivalent to sequestering approx.{' '}
              {typeof scan.co2e === 'number' ? (scan.co2e / 1000).toFixed(2) : '0.00'} tonnes of CO₂
            </Text>
          </View>

          {/* Metrics Grid */}
          <Text style={styles.sectionHeading}>Tree Allometrics</Text>
          <View style={styles.metricsGrid}>
            {/* DBH */}
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>DBH (Trunk Diameter)</Text>
              <Text style={styles.metricValue}>
                {typeof scan.dbh === 'number' ? scan.dbh.toFixed(1) : scan.dbh}
                <Text style={styles.metricUnit}> cm</Text>
              </Text>
            </View>

            {/* Height */}
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Estimated Height</Text>
              <Text style={styles.metricValue}>
                {typeof scan.height === 'number' ? scan.height.toFixed(1) : scan.height}
                <Text style={styles.metricUnit}> m</Text>
              </Text>
            </View>

            {/* Biomass */}
            <View style={styles.metricBoxFull}>
              <Text style={styles.metricLabel}>Above-Ground Biomass (AGB)</Text>
              <Text style={styles.metricValue}>
                {typeof scan.biomass === 'number' ? scan.biomass.toFixed(1) : scan.biomass}
                <Text style={styles.metricUnit}> kg dry weight</Text>
              </Text>
            </View>
          </View>

          {/* Species Classification */}
          {scan.species_classification && (
            <View style={styles.speciesCard}>
              <View style={styles.speciesHeader}>
                <Text style={styles.speciesTag}>🌿 Species Identification</Text>
                {scan.species_classification.confidence ? (
                  <Text style={styles.confidenceText}>
                    {(scan.species_classification.confidence * 100).toFixed(0)}% match
                  </Text>
                ) : null}
              </View>
              <Text style={styles.speciesName}>
                {scan.species_classification.top_match}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Upload', { screen: 'UploadForm' })}
            >
              <Text style={styles.primaryButtonText}>Scan Another Tree</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Gallery')}
            >
              <Text style={styles.secondaryButtonText}>View All in Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16a34a',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroHeader: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroDate: {
    fontSize: 14,
    color: '#dcfce7',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: -20,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  carbonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  carbonCardOverlap: {
    marginTop: -28,
  },
  carbonLabel: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  carbonValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  carbonValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#16a34a',
  },
  carbonUnit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d',
    marginLeft: 8,
  },
  carbonHint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricBoxFull: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  speciesCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 28,
  },
  speciesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  speciesTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speciesName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  actions: {
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
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  stateCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  processStepsBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    gap: 6,
  },
  processStepItem: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  jobBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  jobBadgeText: {
    fontSize: 12,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 28,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  serverInfoBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  serverInfoLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serverInfoValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
});
