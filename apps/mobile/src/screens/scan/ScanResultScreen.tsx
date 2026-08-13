import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Alert,
  Linking,
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
import { API_BASE_URL } from '../../lib/config';
import { downloadAndShare } from '../../lib/fileShare';
import SplatViewer, { derivePoints3dUrl } from '../../components/SplatViewer';
import RecalibrateModal from '../../components/RecalibrateModal';
import ClaimToPlotModal from '../../components/plots/ClaimToPlotModal';
import VoraButton from '../../components/VoraButton';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanResult'>;
type Route = RouteProp<ScanStackParamList, 'ScanResult'>;

export default function ScanResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { treeCode } = route.params;
  const { user, token } = useAuth();
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [recalibrateOpen, setRecalibrateOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isProcessingCert, setIsProcessingCert] = useState(false);

  const handleCertificatePress = () => {
    if (!scan || isProcessingCert) return;

    Alert.alert(
      "Sertifikat Karbon",
      "Pilih aksi untuk sertifikat karbon pohon ini:",
      [
        {
          text: "🔍 Lihat Online",
          onPress: () => {
            const url = `${API_BASE_URL}/scans/${scan.tree_code}/certificate?token=${token || ''}`;
            Linking.openURL(url).catch(() => {
              Alert.alert("Error", "Gagal membuka URL sertifikat.");
            });
          }
        },
        {
          text: "💾 Download & Share",
          onPress: async () => {
            setIsProcessingCert(true);
            const url = `${API_BASE_URL}/scans/${scan.tree_code}/certificate`;
            const filename = `Certificate_${scan.tree_code}.pdf`;
            try {
              await downloadAndShare(url, filename, 'application/pdf', token);
            } finally {
              setIsProcessingCert(false);
            }
          }
        },
        {
          text: "Batal",
          style: "cancel"
        }
      ]
    );
  };

  const { data: history, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['scan-history', treeCode],
    queryFn: () => client.scans.getHistory(treeCode),
    retry: 2,
  });

  const scans = history ?? [];
  const scan: ScanRecord | undefined = scans.find((s) => s.id === selectedScanId) ?? scans[0];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-sm font-sansBold text-slate-700 font-bold">Loading Scan Result...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !scan) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Text className="text-xl font-sansBold text-red-650 mb-2 font-bold">Could Not Load Result</Text>
        <Text className="text-sm font-sans text-slate-500 text-center mb-6 px-4">
          {(error as Error)?.message || `No scan data found for ${treeCode}.`}
        </Text>
        <VoraButton title="Retry" onPress={() => refetch()} variant="primary" className="w-full max-w-[200px]" />
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        scrollEnabled={scrollEnabled}
        className="flex-1 bg-slate-50/60"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#10b981" colors={['#10b981']} />}
      >
        {/* Hero Header */}
        <View className="bg-white border-b border-slate-200/50 px-6 pt-6 pb-8">
          <View className="flex-row items-center mb-3">
            <View className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
              <Text className="text-[10px] font-sansBold text-emerald-800 font-bold">✓ 3D Scan Complete</Text>
            </View>
          </View>
          <Text className="text-3xl font-serif text-slate-900 mb-1">{scan.tree_code}</Text>
          <Text className="text-xs text-slate-500 font-sans">
            {new Date(scan.scan_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View className="px-5 pt-4">
          {scan.splat_file_url ? (
            <View className="mt-2 mb-5 rounded-2xl overflow-hidden border border-slate-200">
              <SplatViewer
                treeCode={scan.tree_code}
                splatFileUrl={scan.splat_file_url}
                points3dUrl={scan.points3d_url || derivePoints3dUrl(scan.splat_file_url)}
                thumbnailUrl={scan.thumbnail_url}
                token={token}
                onMetricsUpdated={() => refetch()}
                onInteractionStateChange={setScrollEnabled}
              />
            </View>
          ) : (
            scan.thumbnail_url && (
              <Image source={{ uri: scan.thumbnail_url }} className="w-full h-52 rounded-2xl mb-5 bg-slate-200 border border-slate-200 shadow-sm" resizeMode="cover" />
            )
          )}


          {/* Carbon card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-4">
            <Text className="text-[10px] font-sansBold text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Estimated Carbon Stored</Text>
            <Text className="text-4xl font-serif text-vora-dark mb-1">{formatCO2e(scan.co2e_kg)}</Text>
            <Text className="text-xs font-sansMedium text-slate-500">
              {formatCO2eRange(scan.co2e_low_kg, scan.co2e_high_kg, scan.co2e_uncertainty_pct)}
            </Text>
          </View>

          {/* Status badges */}
          <View className="flex-row gap-2 mb-4 flex-wrap">
            <StatusBadge label={scaleInfo.shortLabel} color={scaleInfo.color} />
            <StatusBadge label={qualityInfo.label} color={qualityInfo.color} />
          </View>

          {/* Height used disclaimer if needed */}
          {heightInfo.showDisclaimer && heightInfo.disclaimer && (
            <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
              <Text className="text-xs font-sans text-amber-850 leading-relaxed">{heightInfo.disclaimer}</Text>
            </View>
          )}

          {/* Metrics grid */}
          <Text className="text-lg font-serif text-slate-900 mb-3 mt-2">Tree Allometrics</Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            <MetricBox label="DBH (Trunk Diameter)" value={formatDBH(scan.dbh_cm)} />
            <MetricBox label={`Height (${heightInfo.label})`} value={formatHeight(scan.tinggi_m)} />
            <MetricBox label="Above-Ground Biomass" value={formatBiomass(scan.agb_kg)} />
            <MetricBox label="Below-Ground Biomass" value={formatBiomass(scan.bgb_kg)} />
          </View>

          {/* Species */}
          <View className="bg-emerald-50 border border-emerald-100/60 rounded-2xl p-4 mb-5">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-[10px] font-sansBold text-emerald-800 uppercase tracking-wider font-bold">🌿 Species Identification</Text>
              {species.confidence != null && (
                <View className="bg-emerald-100/80 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-sansBold text-emerald-850 font-bold">{formatConfidence(species.confidence)} match</Text>
                </View>
              )}
            </View>
            <Text className="text-base font-sansBold text-emerald-950 font-bold">{species.displayName}</Text>
          </View>

          {/* How calculated */}
          <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
            <Text className="text-xs font-sansBold text-slate-900 mb-3 uppercase tracking-wide font-bold">How This Was Calculated</Text>
            <CalcRow label="Wood density" value={`${formatWoodDensity(scan.wood_density_used)} (${scan.wood_density_source || 'n/a'})`} />
            <CalcRow label="Climate zone" value={scan.climate_zone_detected || 'Unknown'} />
            <CalcRow label="Formula used" value={scan.formula_used || 'n/a'} />
            <CalcRow label="Root-to-shoot ratio" value={scan.root_to_shoot_ratio != null ? scan.root_to_shoot_ratio.toFixed(2) : 'n/a'} />
            {hasScanGPS(scan) && <CalcRow label="GPS" value={formatGPS(scan.gps_lat, scan.gps_lon)} />}
          </View>

          {/* Recalibrate */}
          {scan.thumbnail_url && (
            <VoraButton
              title="Recalibrate Trunk (2D Photo)"
              variant="secondary"
              onPress={() => setRecalibrateOpen(true)}
              className="mb-4"
            />
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5">
              <Text className="text-xs font-sansBold text-red-800 mb-2 font-bold">⚠️ Things to Know About This Estimate</Text>
              {warnings.map((w, i) => (
                <React.Fragment key={i}>
                  <Text className="text-[11px] font-sans text-red-650 mb-1 leading-relaxed">
                    • {w}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Scan History */}
          {scans.length > 1 && (
            <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
              <Text className="text-xs font-sansBold text-slate-900 mb-3 uppercase tracking-wide font-bold">Scan History</Text>
              <View className="gap-2">
                {scans.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    className={`flex-row justify-between items-center p-2 rounded-lg ${s.id === scan.id ? 'bg-slate-100' : ''}`}
                    onPress={() => setSelectedScanId(s.id)}
                  >
                    <Text className="text-xs font-sans text-slate-600">
                      {new Date(s.scan_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text className={`text-xs font-sansBold font-bold ${s.id === scan.id ? 'text-[#191919]' : 'text-slate-400'}`}>
                      {formatCO2e(s.co2e_kg, 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Claim to plot */}
          {user && !scan.claimed_by_user_id && (
            <VoraButton
              title="Claim to a Plot"
              variant="outline"
              onPress={() => setClaimOpen(true)}
              className="mb-5"
            />
          )}

          {/* Actions */}
          <View className="gap-3 mt-2">
            <VoraButton
              title="📄 Download Carbon Certificate"
              variant="primary"
              onPress={handleCertificatePress}
              isLoading={isProcessingCert}
            />
            <VoraButton
              title="Scan Another Tree"
              variant="secondary"
              onPress={() => navigation.navigate('ScanCapture')}
            />
            <VoraButton
              title="View All in Gallery"
              variant="outline"
              onPress={() => navigation.getParent()?.navigate('Gallery')}
            />
          </View>
        </View>
      </ScrollView>

      {scan.thumbnail_url && (
        <RecalibrateModal
          visible={recalibrateOpen}
          scanId={scan.id}
          imageUri={scan.thumbnail_url}
          onClose={() => setRecalibrateOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
      <ClaimToPlotModal
        visible={claimOpen}
        treeCode={scan.tree_code}
        onClose={() => setClaimOpen(false)}
        onClaimed={() => refetch()}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ label, color }: { label: string; color: 'green' | 'amber' | 'red' }) {
  const bgClass = color === 'green' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : color === 'amber' ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-red-50 text-red-800 border border-red-100';
  const textClass = color === 'green' ? 'text-emerald-800' : color === 'amber' ? 'text-amber-800' : 'text-red-800';
  return (
    <View className={`px-2.5 py-1 rounded-lg ${bgClass}`}>
      <Text className={`text-[11px] font-sansBold font-bold ${textClass}`}>{label}</Text>
    </View>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[45%] bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <Text className="text-[10px] font-sansBold text-slate-400 uppercase tracking-wider mb-1 font-bold">{label}</Text>
      <Text className="text-lg font-sansBold text-slate-800 font-bold">{value}</Text>
    </View>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5 border-b border-slate-100/50 last:border-b-0">
      <Text className="text-xs font-sans text-slate-500">{label}</Text>
      <Text className="text-xs font-sansBold text-slate-800 flex-shrink text-right pl-3 font-bold">{value}</Text>
    </View>
  );
}
