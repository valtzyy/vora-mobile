import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { API_BASE_URL } from '../../lib/config';
import { downloadAndShare } from '../../lib/fileShare';
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
  const { user, token } = useAuth();

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

  const shannonIndex = useMemo(() => {
    if (scans.length === 0) return 0.0;
    const speciesCounts: Record<string, number> = {};
    let unidentifiedCount = 0;
    
    for (const s of scans) {
      let preds = s.species_predictions;
      if (typeof preds === 'string') {
        try {
          preds = JSON.parse(preds);
        } catch {
          preds = null;
        }
      }
      const name = (Array.isArray(preds) && preds.length > 0) ? preds[0]?.scientific_name : null;
      if (name) {
        const cleanName = name.trim().toLowerCase();
        speciesCounts[cleanName] = (speciesCounts[cleanName] || 0) + 1;
      } else {
        unidentifiedCount++;
      }
    }

    let sum = 0.0;
    for (const count of Object.values(speciesCounts)) {
      const p_i = count / scans.length;
      sum += p_i * Math.log(p_i);
    }
    if (unidentifiedCount > 0) {
      const p_u = unidentifiedCount / scans.length;
      sum += p_u * Math.log(p_u);
    }
    return -sum;
  }, [scans]);

  const { diversityLevel, diversityDesc } = useMemo(() => {
    if (scans.length === 0) {
      return {
        diversityLevel: 'No Trees Yet',
        diversityDesc: 'Add trees to this plot to evaluate species biodiversity.'
      };
    }
    if (shannonIndex < 1.5) {
      return {
        diversityLevel: 'Low Diversity',
        diversityDesc: 'This plot has low species diversity, meaning it is dominated by one or a few species.'
      };
    } else if (shannonIndex <= 3.0) {
      return {
        diversityLevel: 'Medium Diversity',
        diversityDesc: 'This plot has moderate species diversity, indicating a healthy mix of species.'
      };
    } else {
      return {
        diversityLevel: 'High Diversity',
        diversityDesc: 'This plot has high species diversity, reflecting a highly resilient ecological structure.'
      };
    }
  }, [shannonIndex, scans.length]);

  const handleExportPress = () => {
    if (!plot) return;
    Alert.alert(
      'Export Carbon Data',
      'Select a format to download and share the plot carbon metrics:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export CSV',
          onPress: () => {
            const url = `${API_BASE_URL}/plots/${plot.plot_code}/export?format=csv`;
            const filename = `Plot_${plot.plot_code}_Carbon_Data.csv`;
            downloadAndShare(url, filename, 'text/csv', token);
          }
        },
        {
          text: 'Export Excel (.xlsx)',
          onPress: () => {
            const url = `${API_BASE_URL}/plots/${plot.plot_code}/export?format=xlsx`;
            const filename = `Plot_${plot.plot_code}_Carbon_Data.xlsx`;
            downloadAndShare(url, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', token);
          }
        }
      ]
    );
  };

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
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    );
  }

  if (isError || !plot) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <Text className="text-lg font-bold text-red-650 mb-1.5">Could Not Load Plot</Text>
        <Text className="text-xs text-slate-500 text-center mb-4">
          {error instanceof VoraApiError ? error.detail : (error as Error)?.message || 'Plot not found.'}
        </Text>
        <TouchableOpacity
          className="bg-emerald-600 py-2.5 px-5 rounded-xl active:scale-[0.97]"
          onPress={() => refetch()}
        >
          <Text className="text-white text-xs font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const targetProgress =
    plot.target_co2e_kg && plot.target_co2e_kg > 0
      ? Math.min(100, ((aggregation?.total_co2e_kg ?? 0) / plot.target_co2e_kg) * 100)
      : null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="flex-row justify-between items-start mb-1">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-slate-900">{plot.name}</Text>
            {!!plot.owner?.display_name && (
              <Text className="text-xs text-slate-400 mt-0.5">by {plot.owner.display_name}</Text>
            )}
          </View>
          {isOwner && (
            <TouchableOpacity
              className="bg-slate-100 px-3.5 py-2 rounded-xl active:scale-[0.97]"
              onPress={() => setEditOpen(true)}
            >
              <Text className="text-xs font-bold text-slate-650">Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!plot.description && (
          <Text className="text-xs text-slate-500 mt-2 mb-4 leading-5 font-medium">
            {plot.description}
          </Text>
        )}

        {/* Carbon target gauge */}
        <View className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-4.5 shadow-sm">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Total Carbon Stored
          </Text>
          <Text className="text-3xl font-bold text-slate-900 mb-2.5">
            {formatCO2e(aggregation?.total_co2e_kg ?? 0, 0)}
          </Text>
          {targetProgress != null && (
            <>
              <View className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${targetProgress}%` }} />
              </View>
              <Text className="text-[10px] text-slate-400 mt-1.5 font-medium">
                {targetProgress.toFixed(0)}% of {formatCO2e(plot.target_co2e_kg, 0)} target
              </Text>
            </>
          )}
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-4.5">
          <StatBox label="Trees" value={String(scans.length)} />
          <StatBox label="Avg DBH" value={formatDBH(stats.avgDbh)} />
          <StatBox label="Avg Height" value={formatHeight(stats.avgHeight)} />
        </View>

        {/* Species Distribution & Biodiversity card */}
        {stats.topSpecies.length > 0 && (
          <View className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-4.5 shadow-sm">
            <Text className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
              Species Distribution & Biodiversity
            </Text>

            {/* Shannon-Wiener Biodiversity Index Display */}
            <View className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 flex flex-col gap-1.5 mb-4">
              <View className="flex-row justify-between items-baseline">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Shannon-Wiener Index (H')
                </Text>
                <Text className="text-base font-bold text-[#191919]">
                  {shannonIndex.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    shannonIndex < 1.5 ? 'bg-amber-500' : shannonIndex <= 3.0 ? 'bg-emerald-500' : 'bg-sky-500'
                  }`}
                />
                <Text className="text-xs font-bold text-slate-700">{diversityLevel}</Text>
              </View>
              <Text className="text-[10px] text-slate-500 leading-relaxed font-medium">
                {diversityDesc}
              </Text>
              <Text className="border-t border-slate-200/80 mt-1 pt-1.5 text-[9px] text-slate-450 leading-relaxed italic font-medium">
                Note: Higher biodiversity forests are generally associated with premium pricing in voluntary carbon markets due to ecological resilience and environmental co-benefits.
              </Text>
            </View>

            <Text className="font-bold text-[9px] text-slate-400 uppercase tracking-widest mb-3">
              Contribution per Species
            </Text>
            <View className="flex flex-col gap-3">
              {stats.topSpecies.map(([name, count]) => (
                <View key={name} className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-700 font-medium" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-xs font-bold text-emerald-600">{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Grid / Map toggle */}
        <View className="flex-row gap-2.5 mb-3">
          <TouchableOpacity
            className={`py-2 px-4.5 rounded-full ${view === 'grid' ? 'bg-emerald-50' : 'bg-slate-100'} active:scale-[0.97]`}
            onPress={() => setView('grid')}
          >
            <Text className={`text-xs font-bold ${view === 'grid' ? 'text-emerald-700' : 'text-slate-550'}`}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`py-2 px-4.5 rounded-full ${view === 'map' ? 'bg-emerald-50' : 'bg-slate-100'} active:scale-[0.97]`}
            onPress={() => setView('map')}
          >
            <Text className={`text-xs font-bold ${view === 'map' ? 'text-emerald-700' : 'text-slate-550'}`}>Map</Text>
          </TouchableOpacity>
        </View>

        {scans.length === 0 ? (
          <Text className="text-xs text-slate-400 italic mb-4">No trees in this plot yet.</Text>
        ) : view === 'grid' ? (
          <PlotGrid scans={scans} onPositionsChange={handlePositionsChange} />
        ) : (
          <PlotMapView scans={scans} centroidLat={plot.gps_centroid_lat} centroidLon={plot.gps_centroid_lon} />
        )}

        {isOwner && (
          <View className="flex-row gap-3 mb-5 mt-3">
            <TouchableOpacity
              className="flex-1 bg-emerald-600 py-3 rounded-xl items-center justify-center active:scale-[0.97]"
              onPress={() => setClaimOpen(true)}
              activeOpacity={0.8}
            >
              <Text className="text-white text-xs font-bold">+ Add Tree</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-[#191919] py-3 rounded-xl items-center justify-center active:scale-[0.97]"
              onPress={handleExportPress}
              activeOpacity={0.8}
            >
              <Text className="text-white text-xs font-bold">📤 Export Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tree list */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Trees</Text>
        {scans.map((scan) => (
          <View key={scan.tree_code} className="flex-row items-center py-3.5 border-b border-slate-100">
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 font-mono">{scan.tree_code}</Text>
              <Text className="text-xs text-slate-400 mt-0.5 font-medium">
                DBH {formatDBH(scan.dbh_cm)} · {formatHeight(scan.tinggi_m)} · {formatCO2e(scan.co2e_kg, 0)}
              </Text>
            </View>
            {isOwner && (
              <TouchableOpacity onPress={() => handleRemoveScan(scan.tree_code)} hitSlop={8}>
                <Text className="text-xs font-bold text-red-500">Remove</Text>
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
    <View className="flex-1 bg-slate-50 border border-slate-200/50 rounded-xl py-3.5 items-center">
      <Text className="text-base font-bold text-slate-900">{value}</Text>
      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</Text>
    </View>
  );
}
