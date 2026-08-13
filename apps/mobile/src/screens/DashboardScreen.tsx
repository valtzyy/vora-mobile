import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { formatCO2eCompact, getDisplaySpecies, isScanValid } from '@vora/domain';
import type { Plot } from '@vora/types';
import { client } from '../lib/voraClient';
import { useAuth } from '../lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import VoraButton from '../components/VoraButton';

type Tab = 'trees' | 'plots';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('trees');

  // Query user scans
  const scansQuery = useQuery({
    queryKey: ['scans', 'mine', user?.id],
    queryFn: () => client.plots.getUserScans(user!.id),
    enabled: !!user && tab === 'trees',
    retry: 1,
  });

  // Query user plots
  const plotsQuery = useQuery({
    queryKey: ['plots', 'mine', user?.id],
    queryFn: () => client.plots.getUserPlots(user!.id),
    enabled: !!user && tab === 'plots',
    retry: 1,
  });

  const activeQuery = tab === 'trees' ? scansQuery : plotsQuery;
  const displayScans = (scansQuery.data?.scans ?? []).filter(isScanValid);
  const displayPlots = plotsQuery.data?.plots ?? [];

  const handleRefresh = () => {
    activeQuery.refetch();
  };

  // If not logged in
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-6">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="items-center w-full max-w-[320px]">
          <View className="w-16 h-16 rounded-full bg-emerald-50 justify-center items-center mb-5 border border-emerald-100/50">
            <Ionicons name="stats-chart-outline" size={30} color="#059669" />
          </View>
          <Text className="text-xl font-sansBold text-slate-900 mb-2 text-center font-bold">
            Sign In Required
          </Text>
          <Text className="text-sm font-sans text-slate-500 text-center leading-relaxed mb-6">
            Log in from the Account tab to access your private dashboard, view your plots, and manage your tree measurements.
          </Text>
          <VoraButton
            title="Go to Account"
            onPress={() => navigation.navigate('Account')}
            variant="primary"
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  const isBusy = activeQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
        <View className="flex-col">
          <Text className="font-serif text-3xl text-vora-dark mb-0.5">Dashboard</Text>
          <Text className="text-[10px] font-sansBold text-slate-400 uppercase tracking-wider">
            {tab === 'trees'
              ? `${displayScans.length} of your trees`
              : `${displayPlots.length} of your plots`}
          </Text>
        </View>
        {tab === 'plots' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreatePlot')}
            className="bg-emerald-600 px-3.5 py-2 rounded-xl shadow-sm active:bg-emerald-700"
          >
            <Text className="color-white text-xs font-sansBold font-bold">+ New Plot</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mb-4 mt-2 gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTab('trees')}
          className={`px-4 py-2 rounded-full border ${tab === 'trees' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200/60'}`}
        >
          <Text className={`text-xs font-sansBold ${tab === 'trees' ? 'text-emerald-700' : 'text-slate-500'}`}>
            My Trees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTab('plots')}
          className={`px-4 py-2 rounded-full border ${tab === 'plots' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200/60'}`}
        >
          <Text className={`text-xs font-sansBold ${tab === 'plots' ? 'text-emerald-700' : 'text-slate-500'}`}>
            My Plots
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading state */}
      {isBusy ? (
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-base font-sansBold text-vora-dark">
            Loading {tab === 'trees' ? 'My Trees...' : 'My Plots...'}
          </Text>
        </View>
      ) : activeQuery.isError ? (
        /* Error state */
        <View className="flex-1 justify-center items-center p-6">
          <View className="w-12 h-12 rounded-full bg-red-50 justify-center items-center mb-4 border border-red-100/50">
            <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
          </View>
          <Text className="text-lg font-sansBold text-red-700 mb-1 text-center">Connection Failed</Text>
          <Text className="text-xs font-sans text-slate-500 text-center mb-5 max-w-[280px]">
            {(activeQuery.error as Error)?.message || 'A network error occurred while connecting to the Vora server.'}
          </Text>
          <VoraButton
            title="Try Again"
            onPress={() => activeQuery.refetch()}
            variant="primary"
            className="w-48"
          />
        </View>
      ) : (tab === 'trees' ? displayScans.length === 0 : displayPlots.length === 0) ? (
        /* Empty State */
        <View className="flex-1 justify-center items-center p-6">
          <View className="w-16 h-16 rounded-full bg-emerald-50 justify-center items-center mb-4 border border-emerald-100/50">
            <Ionicons name={tab === 'trees' ? 'leaf-outline' : 'grid-outline'} size={28} color="#059669" />
          </View>
          <Text className="text-lg font-serif text-slate-900 mb-1.5 text-center">
            No {tab === 'trees' ? 'Trees' : 'Plots'} Found
          </Text>
          <Text className="text-xs font-sans text-slate-500 text-center leading-relaxed mb-6 max-w-[260px]">
            {tab === 'trees'
              ? "You haven't scanned or claimed any trees under your account yet."
              : "You haven't created or claimed any plots under your account yet."}
          </Text>
          {tab === 'plots' && (
            <VoraButton
              title="Create Your First Plot"
              onPress={() => navigation.navigate('CreatePlot')}
              variant="primary"
              className="w-56"
            />
          )}
        </View>
      ) : (
        /* Success List */
        <ScrollView
          className="flex-1 bg-slate-50/60"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching}
              onRefresh={handleRefresh}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
        >
          {tab === 'trees'
            ? displayScans.map((scan) => {
                const species = getDisplaySpecies(scan.species_predictions);
                const isInvalid = scan.dbh_cm === null || scan.dbh_cm === undefined;
                return (
                  <TouchableOpacity
                    key={scan.id}
                    activeOpacity={0.75}
                    className="bg-white rounded-[1.25rem] p-2 mb-5 border border-slate-200/80 shadow-sm"
                    onPress={() => {
                      navigation.navigate('ScanResult', {
                        treeCode: scan.tree_code,
                      });
                    }}
                  >
                    {/* Image / Hero part */}
                    <View className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100">
                      {scan.thumbnail_url ? (
                        <>
                          <Image
                            source={{ uri: scan.thumbnail_url }}
                            className="absolute inset-0 w-full h-full"
                            resizeMode="cover"
                          />
                          <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
                        </>
                      ) : (
                        <View className="absolute inset-0 flex items-center justify-center">
                          <Text className="text-4xl">🌲</Text>
                        </View>
                      )}

                      {/* ID Badge */}
                      <View className="absolute top-3 left-3 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        <Text className="text-[10px] font-sansBold text-white font-bold">#{scan.id}</Text>
                      </View>

                      {/* Date */}
                      <View className="absolute top-3 right-3 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        <Text className="text-[10px] font-sansMedium text-white font-semibold">
                          {new Date(scan.scan_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>

                      {/* Tree Code */}
                      <Text className="absolute bottom-3 left-3 text-lg font-sansBold text-white tracking-tight font-bold">
                        {scan.tree_code}
                      </Text>
                    </View>

                    {/* Bottom details */}
                    <View className="flex-row justify-between items-center px-2 py-3">
                      <View className="flex-col">
                        <Text className="text-base font-sansBold text-slate-900 mb-0.5 font-bold">
                          {scan.co2e_kg ? `${Math.round(scan.co2e_kg)} kg CO₂e` : '-'}
                        </Text>
                        {isInvalid ? (
                          <Text className="text-[10px] font-sansBold text-rose-500">
                            Invalid scan
                          </Text>
                        ) : (
                          <Text className="text-[10px] font-sansMedium text-slate-500">
                            {scan.dbh_cm ? `${scan.dbh_cm.toFixed(1)} cm DBH` : '-'} / {scan.tinggi_m ? `${scan.tinggi_m.toFixed(1)} m H` : '-'}
                          </Text>
                        )}
                      </View>

                      <View className="bg-[#141417] rounded-lg px-4 py-2 self-center">
                        <Text className="text-xs font-sansBold text-white font-bold">View</Text>
                      </View>
                    </View>

                    {/* Species prediction banner */}
                    {species.isIdentified && (
                      <View className="bg-emerald-50 border-t border-emerald-100/50 flex-row items-center p-2.5 rounded-b-xl -mx-2 -mb-2 mt-1">
                        <Ionicons name="leaf-outline" size={14} color="#065f46" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-sansMedium text-emerald-800 flex-1" numberOfLines={1}>
                          {species.displayName}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            : displayPlots.map((plot: Plot) => (
                <TouchableOpacity
                  key={plot.id}
                  activeOpacity={0.75}
                  className="bg-white rounded-3xl p-4 mb-5 border border-slate-200/80 shadow-sm"
                  onPress={() => navigation.navigate('PlotDetail', { plotCode: plot.plot_code })}
                >
                  {plot.thumbnails && plot.thumbnails.length > 0 && (
                    <View className="flex-row gap-2 mb-3">
                      {plot.thumbnails.slice(0, 3).map((uri, i) => {
                        const KeyedView = View as any;
                        return (
                          <KeyedView key={i}>
                            <Image source={{ uri }} className="w-16 h-16 rounded-xl bg-slate-100" />
                          </KeyedView>
                        );
                      })}
                    </View>
                  )}
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-sansBold text-slate-900 flex-1 mr-2 font-bold" numberOfLines={1}>
                      {plot.name}
                    </Text>
                    <View className={`px-2 py-0.5 rounded-md ${plot.privacy === 'private' ? 'bg-amber-50 border border-amber-100/50' : 'bg-emerald-50 border border-emerald-100/50'}`}>
                      <Text className={`text-[9px] font-sansBold uppercase tracking-wide font-bold ${plot.privacy === 'private' ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {plot.privacy}
                      </Text>
                    </View>
                  </View>
                  {!!plot.description && (
                    <Text className="text-xs font-sans text-slate-500 mb-3" numberOfLines={2}>
                      {plot.description}
                    </Text>
                  )}
                  <View className="flex-row justify-between items-center border-t border-slate-100 pt-3 mt-1">
                    <Text className="text-xs font-sansBold text-slate-400 font-bold">
                      {plot.scans_count ?? 0} trees
                    </Text>
                    <Text className="text-xs font-sansBold text-emerald-600 font-bold">
                      {formatCO2eCompact(plot.total_co2e_kg)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
