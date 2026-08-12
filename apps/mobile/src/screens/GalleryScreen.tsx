import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { ScanRecord } from '@vora/types';
import { formatDBH, formatHeight, formatCO2eCompact, getDisplaySpecies, isScanValid } from '@vora/domain';
import { client } from '../lib/voraClient';
import { API_BASE_URL } from '../lib/config';

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

  // Backend returns rows with dbh_cm IS NULL filtered out by default (`/scans`),
  // but we still guard client-side via isScanValid() in case a stale/failed
  // scan ever leaks through.
  const displayScans = (data?.scans ?? []).filter(isScanValid);

  // 1. Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingTitle}>Loading Tree Scans...</Text>
          <Text style={styles.loadingSubtitle}>Fetching your historical carbon measurements</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Unable to Load Scans</Text>
          <Text style={styles.errorDescription}>
            {(error as Error)?.message || 'A network error occurred while connecting to the Vora server.'}
          </Text>
          <View style={styles.serverInfoBox}>
            <Text style={styles.serverInfoLabel}>Target Endpoint:</Text>
            <Text style={styles.serverInfoValue} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
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
                <Text style={styles.primaryButtonText}>Reconnecting...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Try Again</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Empty State
  if (displayScans.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.stateCard}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconText}>🌲</Text>
          </View>
          <Text style={styles.emptyTitle}>No Scans Recorded Yet</Text>
          <Text style={styles.emptyDescription}>
            You haven't scanned any trees yet. Record a smartphone video around a tree trunk to measure its biomass and carbon storage.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Your First Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Success List
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#16a34a']}
            tintColor="#16a34a"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan Gallery</Text>
          <Text style={styles.headerSubtitle}>
            {displayScans.length} tree carbon {displayScans.length === 1 ? 'record' : 'records'} available
          </Text>
        </View>

        {displayScans.map((scan) => {
          const species = getDisplaySpecies(scan.species_predictions);
          return (
            <TouchableOpacity
              key={scan.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('Scan', {
                  screen: 'ScanResult',
                  params: { treeCode: scan.tree_code },
                });
              }}
            >
              {scan.thumbnail_url && (
                <Image
                  source={{ uri: scan.thumbnail_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>
                  {new Date(scan.scan_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{scan.tree_code}</Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>DBH</Text>
                  <Text style={styles.metricValue}>{formatDBH(scan.dbh_cm)}</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>Height</Text>
                  <Text style={styles.metricValue}>{formatHeight(scan.tinggi_m)}</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>CO2e</Text>
                  <Text style={[styles.metricValue, styles.carbonHighlight]}>
                    {formatCO2eCompact(scan.co2e_kg)}
                  </Text>
                </View>
              </View>

              <View style={styles.speciesContainer}>
                <Text style={styles.speciesIcon}>🌿</Text>
                <Text style={styles.speciesText} numberOfLines={1}>
                  {species.displayName}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
    color: '#991b1b',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
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
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e5e7eb',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  carbonHighlight: {
    color: '#16a34a',
  },
  speciesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  speciesIcon: {
    marginRight: 6,
    fontSize: 14,
  },
  speciesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
});
