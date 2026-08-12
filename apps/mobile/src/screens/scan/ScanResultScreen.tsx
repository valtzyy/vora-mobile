import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { ScanRecord } from '@vora/types';
import {
  formatCO2e,
  formatCO2eRange,
  formatBiomass,
  formatDBH,
  formatHeight,
  formatWoodDensity,
  formatGPS,
  formatConfidence,
  getDisplaySpecies,
  getScaleStatusInfo,
  getHeightStatusInfo,
  getQualityStatusInfo,
  hasScanGPS,
} from '@vora/domain';
import type { ScanStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanResult'>;
type Route = RouteProp<ScanStackParamList, 'ScanResult'>;

const COLOR_MAP: Record<'green' | 'amber' | 'red', { bg: string; text: string }> = {
  green: { bg: '#f0fdf4', text: '#166534' },
  amber: { bg: '#fffbeb', text: '#92400e' },
  red: { bg: '#fef2f2', text: '#991b1b' },
};

export default function ScanResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { treeCode } = route.params;
  const { user } = useAuth();
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);

  const { data: history, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['scan-history', treeCode],
    queryFn: () => client.scans.getHistory(treeCode),
    retry: 2,
  });

  const scans = history ?? [];
  const scan: ScanRecord | undefined = scans.find((s) => s.id === selectedScanId) ?? scans[0];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingTitle}>Loading Scan Result...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !scan) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Text style={styles.errorTitle}>Could Not Load Result</Text>
        <Text style={styles.errorSubtitle}>
          {(error as Error)?.message || `No scan data found for ${treeCode}.`}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const species = getDisplaySpecies(scan.species_predictions);
  const scaleInfo = getScaleStatusInfo(scan.scale_status, scan.calibration_source);
  const heightInfo = getHeightStatusInfo(scan.height_used);
  const qualityInfo = getQualityStatusInfo(scan.quality_status);
  const warnings = [
    !qualityInfo.isOk && qualityInfo.description,
    heightInfo.showDisclaimer && heightInfo.disclaimer,
    scan.scale_status !== 'calibrated' && scaleInfo.description,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ffffff" />}
      >
        {/* Hero */}
        <View style={styles.heroHeader}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>✓ 3D Scan Complete</Text>
          </View>
          <Text style={styles.heroTitle}>{scan.tree_code}</Text>
          <Text style={styles.heroDate}>
            {new Date(scan.scan_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.body}>
          {scan.thumbnail_url && (
            <Image source={{ uri: scan.thumbnail_url }} style={styles.heroImage} resizeMode="cover" />
          )}

          {/* Carbon headline + uncertainty range */}
          <View style={[styles.carbonCard, !scan.thumbnail_url && styles.carbonCardOverlap]}>
            <Text style={styles.carbonLabel}>Estimated Carbon Stored</Text>
            <Text style={styles.carbonValue}>{formatCO2e(scan.co2e_kg)}</Text>
            <Text style={styles.carbonRange}>
              {formatCO2eRange(scan.co2e_low_kg, scan.co2e_high_kg, scan.co2e_uncertainty_pct)}
            </Text>
          </View>

          {/* Status badges */}
          <View style={styles.badgeRow}>
            <StatusBadge label={scaleInfo.shortLabel} color={scaleInfo.color} />
            <StatusBadge label={qualityInfo.label} color={qualityInfo.color} />
          </View>

          {/* Mandatory disclaimer */}
          {heightInfo.showDisclaimer && heightInfo.disclaimer && (
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>{heightInfo.disclaimer}</Text>
            </View>
          )}

          {/* Metrics grid */}
          <Text style={styles.sectionHeading}>Tree Allometrics</Text>
          <View style={styles.metricsGrid}>
            <MetricBox label="DBH (Trunk Diameter)" value={formatDBH(scan.dbh_cm)} />
            <MetricBox label={`Height (${heightInfo.label})`} value={formatHeight(scan.tinggi_m)} />
            <MetricBox label="Above-Ground Biomass" value={formatBiomass(scan.agb_kg)} />
            <MetricBox label="Below-Ground Biomass" value={formatBiomass(scan.bgb_kg)} />
          </View>

          {/* Species */}
          <View style={styles.speciesCard}>
            <View style={styles.speciesHeader}>
              <Text style={styles.speciesTag}>🌿 Species Identification</Text>
              {species.confidence != null && (
                <Text style={styles.confidenceText}>{formatConfidence(species.confidence)} match</Text>
              )}
            </View>
            <Text style={styles.speciesName}>{species.displayName}</Text>
          </View>

          {/* How calculated */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>How This Was Calculated</Text>
            <CalcRow label="Wood density" value={`${formatWoodDensity(scan.wood_density_used)} (${scan.wood_density_source || 'n/a'})`} />
            <CalcRow label="Climate zone" value={scan.climate_zone_detected || 'Unknown'} />
            <CalcRow label="Formula used" value={scan.formula_used || 'n/a'} />
            <CalcRow label="Root-to-shoot ratio" value={scan.root_to_shoot_ratio != null ? scan.root_to_shoot_ratio.toFixed(2) : 'n/a'} />
            {hasScanGPS(scan) && <CalcRow label="GPS" value={formatGPS(scan.gps_lat, scan.gps_lon)} />}
          </View>

          {/* Warnings panel */}
          {warnings.length > 0 && (
            <View style={styles.warningsBox}>
              <Text style={styles.warningsTitle}>⚠ Things to Know About This Estimate</Text>
              {warnings.map((w, i) => (
                <Text key={i} style={styles.warningsItem}>• {w}</Text>
              ))}
            </View>
          )}

          {/* Scan history timeline */}
          {scans.length > 1 && (
            <View style={styles.historyBox}>
              <Text style={styles.calcTitle}>Scan History</Text>
              {scans.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.historyRow, s.id === scan.id && styles.historyRowActive]}
                  onPress={() => setSelectedScanId(s.id)}
                >
                  <Text style={styles.historyDate}>
                    {new Date(s.scan_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historyCo2e}>{formatCO2e(s.co2e_kg, 0)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Claim to plot (stubbed until Phase 6) */}
          {user && (
            <TouchableOpacity
              style={styles.claimButton}
              activeOpacity={0.8}
              onPress={() => {
                // Wired up once the Plots feature (Phase 6) lands.
              }}
            >
              <Text style={styles.claimButtonText}>Claim to a Plot (coming soon)</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ScanCapture')}
            >
              <Text style={styles.primaryButtonText}>Scan Another Tree</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.getParent()?.navigate('Gallery')}
            >
              <Text style={styles.secondaryButtonText}>View All in Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ label, color }: { label: string; color: 'green' | 'amber' | 'red' }) {
  const c = COLOR_MAP[color];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calcRow}>
      <Text style={styles.calcLabel}>{label}</Text>
      <Text style={styles.calcValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  contentContainer: { paddingBottom: 40 },
  heroHeader: { backgroundColor: '#16a34a', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusPillText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace' },
  heroDate: { fontSize: 14, color: '#dcfce7', marginTop: 4 },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: -20,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  carbonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  carbonCardOverlap: { marginTop: -8 },
  carbonLabel: { fontSize: 13, color: '#15803d', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  carbonValue: { fontSize: 34, fontWeight: '900', color: '#16a34a' },
  carbonRange: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  disclaimerBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  disclaimerText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 14 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  speciesCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 20,
  },
  speciesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  speciesTag: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speciesName: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  calcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  calcTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  calcLabel: { fontSize: 13, color: '#6b7280' },
  calcValue: { fontSize: 13, color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  warningsBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningsTitle: { fontSize: 13, fontWeight: '700', color: '#991b1b', marginBottom: 6 },
  warningsItem: { fontSize: 12, color: '#b91c1c', lineHeight: 18 },
  historyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  historyRowActive: { backgroundColor: '#f0fdf4' },
  historyDate: { fontSize: 13, color: '#6b7280' },
  historyCo2e: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  claimButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  claimButtonText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#ffffff' },
  loadingTitle: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#374151' },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#dc2626', marginBottom: 8, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});
