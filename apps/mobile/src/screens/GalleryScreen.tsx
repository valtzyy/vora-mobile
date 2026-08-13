import React from 'react';
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
import { formatDBH, formatHeight, formatCO2eCompact, getDisplaySpecies, isScanValid } from '@vora/domain';
import { client } from '../lib/voraClient';
import { API_BASE_URL } from '../lib/config';
import VoraButton from '../components/VoraButton';

export default function GalleryScreen() {
  const navigation = useNavigation<any>();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['scans', 'gallery'],
    queryFn: () => client.scans.getList({ limit: 50 }),
    retry: 1,
  });

  const displayScans = (data?.scans ?? []).filter(isScanValid);

  // 1. Loading State
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="items-center w-full max-w-[340px]">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-lg font-sansBold text-vora-dark">Loading Tree Scans...</Text>
          <Text className="mt-1 text-sm font-sans text-slate-500 text-center">Fetching your historical carbon measurements</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="items-center w-full max-w-[340px]">
          <View className="w-16 h-16 rounded-full bg-red-50 justify-center items-center mb-4 border border-red-100/50">
            <Text className="text-2xl">⚠️</Text>
          </View>
          <Text className="text-xl font-sansBold text-red-700 mb-2 text-center">Unable to Load Scans</Text>
          <Text className="text-sm font-sans text-slate-600 text-center leading-5 mb-4">
            {(error as Error)?.message || 'A network error occurred while connecting to the Vora server.'}
          </Text>
          <View className="bg-slate-50 rounded-xl p-3 w-full mb-5 items-center border border-slate-200/60">
            <Text className="text-[10px] font-sansBold text-slate-400 uppercase tracking-wide">Target Endpoint</Text>
            <Text className="text-xs font-sansMedium text-slate-700 mt-0.5" numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>
          <VoraButton
            title={isRefetching ? "Reconnecting..." : "Try Again"}
            onPress={() => refetch()}
            isLoading={isRefetching}
            variant="primary"
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  // 3. Empty State
  if (displayScans.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="items-center w-full max-w-[340px]">
          <View className="w-20 h-20 rounded-full bg-emerald-50 justify-center items-center mb-4 border border-emerald-100/50">
            <Text className="text-3xl">🌲</Text>
          </View>
          <Text className="text-22 font-serif text-slate-900 mb-2 text-center">No Scans Recorded Yet</Text>
          <Text className="text-sm font-sans text-slate-500 text-center leading-relaxed mb-6">
            You haven't scanned any trees yet. Record a smartphone video around a tree trunk to measure its biomass and carbon storage.
          </Text>
          <VoraButton
            title="Start Your First Scan"
            onPress={() => navigation.navigate('Scan')}
            variant="primary"
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  // 4. Success List
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        className="flex-1 bg-slate-50/60"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        <View className="mb-6 mt-2">
          <Text className="font-serif text-3xl text-vora-dark mb-1">Scan Gallery</Text>
          <Text className="text-xs text-slate-500 font-sans">
            {displayScans.length} tree carbon {displayScans.length === 1 ? 'record' : 'records'} available
          </Text>
        </View>

        {displayScans.map((scan) => {
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
              <View className="relative w-full h-44 rounded-xl overflow-hidden bg-vora-cream">
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

                {/* ID Badge on top left of image */}
                <View className="absolute top-3 left-3 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  <Text className="text-[10px] font-sansBold text-white font-bold">#{scan.id}</Text>
                </View>

                {/* Date on top right of image */}
                <View className="absolute top-3 right-3 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  <Text className="text-[10px] font-sansMedium text-white font-semibold">
                    {new Date(scan.scan_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                {/* Tree Code on bottom left of image */}
                <Text className="absolute bottom-3 left-3 text-lg font-sansBold text-white tracking-tight font-bold">
                  {scan.tree_code}
                </Text>
              </View>

              {/* Bottom Footer Details */}
              <View className="flex-row justify-between items-center px-2 py-3">
                <View className="flex-col">
                  {/* CO2e value */}
                  <Text className="text-base font-sansBold text-vora-black mb-0.5 font-bold">
                    {scan.co2e_kg ? `${Math.round(scan.co2e_kg)} kg CO₂e` : '-'}
                  </Text>
                  {/* DBH / Height subtext */}
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

                {/* View button (Visual only, since whole card is touchable) */}
                <View className="bg-[#141417] rounded-lg px-4 py-2 self-center">
                  <Text className="text-xs font-sansBold text-white font-bold">View</Text>
                </View>
              </View>

              {/* Species identification banner, styled nicely at the bottom if available */}
              {species.isIdentified && (
                <View className="bg-emerald-50 border-t border-emerald-100/50 flex-row items-center p-2.5 rounded-b-xl -mx-2 -mb-2 mt-1">
                  <Text className="mr-1.5 text-xs">🌿</Text>
                  <Text className="text-xs font-sansMedium text-emerald-800 flex-1" numberOfLines={1}>
                    {species.displayName}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
