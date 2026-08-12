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
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Plot } from '@vora/types';
import { formatCO2eCompact } from '@vora/domain';
import type { PlotsStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<PlotsStackParamList, 'PlotsList'>;
type Tab = 'public' | 'mine';

export default function PlotsListScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('public');

  const publicQuery = useQuery({
    queryKey: ['plots', 'public'],
    queryFn: () => client.plots.getList(),
  });

  const mineQuery = useQuery({
    queryKey: ['plots', 'mine', user?.id],
    queryFn: () => client.plots.getUserPlots(user!.id),
    enabled: !!user,
  });

  const activeQuery = tab === 'public' ? publicQuery : mineQuery;
  const plots = activeQuery.data?.plots ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.title}>Plots</Text>
        {user && (
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreatePlot')}>
            <Text style={styles.createButtonText}>+ New Plot</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'public' && styles.tabButtonActive]}
          onPress={() => setTab('public')}
        >
          <Text style={[styles.tabButtonText, tab === 'public' && styles.tabButtonTextActive]}>Public Plots</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'mine' && styles.tabButtonActive]}
          onPress={() => setTab('mine')}
        >
          <Text style={[styles.tabButtonText, tab === 'mine' && styles.tabButtonTextActive]}>My Plots</Text>
        </TouchableOpacity>
      </View>

      {tab === 'mine' && !user ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyDescription}>Log in from the Account tab to see and manage your own plots.</Text>
        </View>
      ) : activeQuery.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : activeQuery.isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Could Not Load Plots</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => activeQuery.refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : plots.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🌳</Text>
          <Text style={styles.emptyTitle}>No Plots Yet</Text>
          <Text style={styles.emptyDescription}>
            {tab === 'public'
              ? 'No public plots have been created yet.'
              : "You haven't created any plots yet."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={activeQuery.isRefetching} onRefresh={() => activeQuery.refetch()} colors={['#16a34a']} />
          }
        >
          {plots.map((plot: Plot) => (
            <TouchableOpacity
              key={plot.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PlotDetail', { plotCode: plot.plot_code })}
            >
              {plot.thumbnails && plot.thumbnails.length > 0 && (
                <View style={styles.thumbRow}>
                  {plot.thumbnails.slice(0, 3).map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.thumb} />
                  ))}
                </View>
              )}
              <View style={styles.cardHeader}>
                <Text style={styles.cardName} numberOfLines={1}>{plot.name}</Text>
                <View style={[styles.privacyBadge, plot.privacy === 'private' && styles.privacyBadgePrivate]}>
                  <Text style={styles.privacyBadgeText}>{plot.privacy}</Text>
                </View>
              </View>
              {!!plot.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>{plot.description}</Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.cardStat}>{plot.scans_count ?? 0} trees</Text>
                <Text style={styles.cardStatCarbon}>{formatCO2eCompact(plot.total_co2e_kg)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  createButton: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6' },
  tabButtonActive: { backgroundColor: '#dcfce7' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabButtonTextActive: { color: '#166534' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  thumbRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  privacyBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  privacyBadgePrivate: { backgroundColor: '#fef3c7' },
  privacyBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534', textTransform: 'uppercase' },
  cardDescription: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardStat: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  cardStatCarbon: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  emptyDescription: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 16, backgroundColor: '#16a34a', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
