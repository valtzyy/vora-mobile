import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { VoraApiError } from '@vora/api-client';
import { formatCO2e, formatDBH, formatHeight, getDisplaySpecies } from '@vora/domain';
import type { PlotsStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { useAuth } from '../../lib/AuthContext';
import PlotGrid, { type PlotGridPosition } from '../../components/plots/PlotGrid';
import PlotMapView from '../../components/plots/PlotMapView';
import ClaimTreeModal from '../../components/plots/ClaimTreeModal';
import EditPlotModal from '../../components/plots/EditPlotModal';

type Nav = NativeStackNavigationProp<PlotsStackParamList, 'PlotDetail'>;
type Route = RouteProp<PlotsStackParamList, 'PlotDetail'>;

const SAVE_DEBOUNCE_MS = 500;

export default function PlotDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { plotCode } = route.params;
  const { user } = useAuth();

  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [claimOpen, setClaimOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['plot-detail', plotCode],
    queryFn: () => client.plots.getDetail(plotCode),
  });

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const plot = data?.plot;
  const scans = data?.scans ?? [];
  const aggregation = data?.aggregation;
  const isOwner = !!(user && plot?.owner_user_id === user.id);

  const stats = useMemo(() => {
    if (scans.length === 0) return { avgDbh: null, avgHeight: null, topSpecies: [] as [string, number][] };
    const dbhVals = scans.map((s) => s.dbh_cm).filter((v): v is number => v != null);
    const heightVals = scans.map((s) => s.tinggi_m).filter((v): v is number => v != null);
    const avgDbh = dbhVals.length ? dbhVals.reduce((a, b) => a + b, 0) / dbhVals.length : null;
    const avgHeight = heightVals.length ? heightVals.reduce((a, b) => a + b, 0) / heightVals.length : null;

    const counts = new Map<string, number>();
    for (const s of scans) {
      const name = getDisplaySpecies(s.species_predictions).displayName;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const topSpecies = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return { avgDbh, avgHeight, topSpecies };
  }, [scans]);

  const handlePositionsChange = useCallback(
    (positions: PlotGridPosition[]) => {
      if (!plot) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        client.plots.saveLayout(plot.id, { layout: positions }).catch(() => {
          // Best-effort auto-save; the user can keep dragging, next debounce retries.
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [plot]
  );

  const handleRemoveScan = (treeCode: string) => {
    if (!plot) return;
    Alert.alert('Remove Tree', `Remove ${treeCode} from this plot? It will become claimable again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.plots.removeScan(plot.id, treeCode);
            refetch();
          } catch (err) {
            const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
            Alert.alert('Could Not Remove Tree', message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  if (isError || !plot) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Could Not Load Plot</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof VoraApiError ? error.detail : (error as Error)?.message || 'Plot not found.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const targetProgress =
    plot.target_co2e_kg && plot.target_co2e_kg > 0
      ? Math.min(100, ((aggregation?.total_co2e_kg ?? 0) / plot.target_co2e_kg) * 100)
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{plot.name}</Text>
            {!!plot.owner?.display_name && <Text style={styles.owner}>by {plot.owner.display_name}</Text>}
          </View>
          {isOwner && (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditOpen(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!plot.description && <Text style={styles.description}>{plot.description}</Text>}

        {/* Carbon target gauge */}
        <View style={styles.carbonCard}>
          <Text style={styles.carbonLabel}>Total Carbon Stored</Text>
          <Text style={styles.carbonValue}>{formatCO2e(aggregation?.total_co2e_kg ?? 0, 0)}</Text>
          {targetProgress != null && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${targetProgress}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {targetProgress.toFixed(0)}% of {formatCO2e(plot.target_co2e_kg, 0)} target
              </Text>
            </>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox label="Trees" value={String(scans.length)} />
          <StatBox label="Avg DBH" value={formatDBH(stats.avgDbh)} />
          <StatBox label="Avg Height" value={formatHeight(stats.avgHeight)} />
        </View>

        {/* Species distribution */}
        {stats.topSpecies.length > 0 && (
          <View style={styles.speciesCard}>
            <Text style={styles.sectionTitle}>Species Distribution</Text>
            {stats.topSpecies.map(([name, count]) => (
              <View key={name} style={styles.speciesRow}>
                <Text style={styles.speciesName} numberOfLines={1}>{name}</Text>
                <Text style={styles.speciesCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Grid / Map toggle */}
        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleButton, view === 'grid' && styles.viewToggleButtonActive]}
            onPress={() => setView('grid')}
          >
            <Text style={[styles.viewToggleText, view === 'grid' && styles.viewToggleTextActive]}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, view === 'map' && styles.viewToggleButtonActive]}
            onPress={() => setView('map')}
          >
            <Text style={[styles.viewToggleText, view === 'map' && styles.viewToggleTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>

        {scans.length === 0 ? (
          <Text style={styles.emptyHint}>No trees in this plot yet.</Text>
        ) : view === 'grid' ? (
          <PlotGrid scans={scans} onPositionsChange={handlePositionsChange} />
        ) : (
          <PlotMapView scans={scans} centroidLat={plot.gps_centroid_lat} centroidLon={plot.gps_centroid_lon} />
        )}

        {isOwner && (
          <TouchableOpacity style={styles.addTreeButton} onPress={() => setClaimOpen(true)}>
            <Text style={styles.addTreeButtonText}>+ Add Tree to Plot</Text>
          </TouchableOpacity>
        )}

        {/* Tree list */}
        <Text style={styles.sectionTitle}>Trees</Text>
        {scans.map((scan) => (
          <View key={scan.tree_code} style={styles.treeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.treeCode}>{scan.tree_code}</Text>
              <Text style={styles.treeStats}>
                DBH {formatDBH(scan.dbh_cm)} · {formatHeight(scan.tinggi_m)} · {formatCO2e(scan.co2e_kg, 0)}
              </Text>
            </View>
            {isOwner && (
              <TouchableOpacity onPress={() => handleRemoveScan(scan.tree_code)} hitSlop={8}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <ClaimTreeModal
        visible={claimOpen}
        plotId={plot.id}
        onClose={() => setClaimOpen(false)}
        onClaimed={() => refetch()}
      />
      <EditPlotModal
        visible={editOpen}
        plot={plot}
        onClose={() => setEditOpen(false)}
        onSaved={() => refetch()}
      />
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#ffffff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#dc2626', marginBottom: 6 },
  errorSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#16a34a', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  owner: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  editButton: { backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  editButtonText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  description: { fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 16, lineHeight: 19 },
  carbonCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  carbonLabel: { fontSize: 12, fontWeight: '700', color: '#15803d', textTransform: 'uppercase', marginBottom: 6 },
  carbonValue: { fontSize: 28, fontWeight: '900', color: '#16a34a', marginBottom: 10 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#dcfce7', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: '#15803d', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  speciesCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  speciesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  speciesName: { fontSize: 13, color: '#374151', flex: 1 },
  speciesCount: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  viewToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  viewToggleButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#f3f4f6' },
  viewToggleButtonActive: { backgroundColor: '#dcfce7' },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  viewToggleTextActive: { color: '#166534' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  addTreeButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  addTreeButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  treeCode: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  treeStats: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  removeText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
});
