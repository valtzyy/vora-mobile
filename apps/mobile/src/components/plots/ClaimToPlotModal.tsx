import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { VoraApiError } from '@vora/api-client';
import { client } from '../../lib/voraClient';
import { useAuth } from '../../lib/AuthContext';

interface ClaimToPlotModalProps {
  visible: boolean;
  treeCode: string;
  onClose: () => void;
  onClaimed: () => void;
}

/** Inverse of ClaimTreeModal: pick one of the user's own plots to claim this scan into. */
export default function ClaimToPlotModal({ visible, treeCode, onClose, onClaimed }: ClaimToPlotModalProps) {
  const { user } = useAuth();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plots', 'mine', user?.id],
    queryFn: () => client.plots.getUserPlots(user!.id),
    enabled: visible && !!user,
  });

  const plots = data?.plots ?? [];

  const handleClaim = async (plotId: number) => {
    setClaimingId(plotId);
    try {
      await client.plots.claimScan(plotId, treeCode);
      onClaimed();
      onClose();
    } catch (err) {
      const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
      Alert.alert('Could Not Claim Scan', message || 'Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Claim to a Plot</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Could not load your plots.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : plots.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>You don't have any plots yet. Create one from the Plots tab first.</Text>
          </View>
        ) : (
          <FlatList
            data={plots}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => handleClaim(item.id)} disabled={claimingId !== null}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                {claimingId === item.id ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <Text style={styles.claimLabel}>Select</Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#16a34a', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 12 },
  claimLabel: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
});
