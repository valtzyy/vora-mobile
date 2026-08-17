import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { VoraApiError } from '@vora/api-client';
import { client } from '../../lib/voraClient';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/i18n';

interface ClaimToPlotModalProps {
  visible: boolean;
  treeCode: string;
  onClose: () => void;
  onClaimed: () => void;
}

/** Inverse of ClaimTreeModal: pick one of the user's own plots to claim this scan into. */
export default function ClaimToPlotModal({ visible, treeCode, onClose, onClaimed }: ClaimToPlotModalProps) {
  const { user } = useAuth();
  const { t } = useSettings();
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
      Alert.alert(t('claim.couldNotClaimScan'), message || t('common.tryAgain'));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('result.claimToPlot')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#616c39" />
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{t('claim.couldNotLoadPlots')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>{t('plot.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : plots.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{t('claim.noPlots')}</Text>
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
                  <ActivityIndicator size="small" color="#616c39" />
                ) : (
                  <Text style={styles.claimLabel}>{t('claim.select')}</Text>
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
    borderBottomColor: '#e7e5e4',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1c1917' },
  closeText: { fontSize: 14, fontWeight: '600', color: '#78716c' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#616c39', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1c1917', flex: 1, marginRight: 12 },
  claimLabel: { fontSize: 13, fontWeight: '700', color: '#616c39' },
});
