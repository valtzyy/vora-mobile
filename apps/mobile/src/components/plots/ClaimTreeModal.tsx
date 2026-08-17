import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { ScanRecord } from '@vora/types';
import { formatDBH, formatCO2eCompact, isScanValid } from '@vora/domain';
import { VoraApiError } from '@vora/api-client';
import { client } from '../../lib/voraClient';
import { useSettings } from '../../lib/i18n';

interface ClaimTreeModalProps {
  visible: boolean;
  plotId: number;
  onClose: () => void;
  onClaimed: () => void;
}

/**
 * Lets a plot owner attach an existing unclaimed scan (claimed_by_user_id
 * IS NULL) into this plot — mirrors the web app's "add/claim tree" modal.
 */
export default function ClaimTreeModal({ visible, plotId, onClose, onClaimed }: ClaimTreeModalProps) {
  const { t } = useSettings();
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['scans', 'unclaimed'],
    queryFn: () => client.scans.getList({ limit: 100 }),
    enabled: visible,
  });

  const unclaimed = (data?.scans ?? []).filter((s) => isScanValid(s) && s.claimed_by_user_id == null);

  const handleClaim = async (scan: ScanRecord) => {
    setClaimingCode(scan.tree_code);
    try {
      await client.plots.claimScan(plotId, scan.tree_code);
      onClaimed();
      onClose();
    } catch (err) {
      const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
      Alert.alert(t('claim.couldNotClaimTree'), message || t('common.tryAgain'));
    } finally {
      setClaimingCode(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('claim.addTreeToPlot')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>{t('claim.done')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#616c39" />
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{t('claim.couldNotLoadScans')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>{t('plot.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : unclaimed.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{t('claim.noUnclaimed')}</Text>
          </View>
        ) : (
          <FlatList
            data={unclaimed}
            keyExtractor={(s) => s.tree_code}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleClaim(item)}
                disabled={claimingCode !== null}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowCode}>{item.tree_code}</Text>
                  <Text style={styles.rowStats}>
                    DBH {formatDBH(item.dbh_cm)} · {formatCO2eCompact(item.co2e_kg)}
                  </Text>
                </View>
                {claimingCode === item.tree_code ? (
                  <ActivityIndicator size="small" color="#616c39" />
                ) : (
                  <Text style={styles.claimLabel}>{t('claim.claim')}</Text>
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
  closeText: { fontSize: 14, fontWeight: '600', color: '#616c39' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#616c39', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  rowCode: { fontSize: 14, fontWeight: '700', color: '#1c1917', fontFamily: 'monospace' },
  rowStats: { fontSize: 12, color: '#78716c', marginTop: 2 },
  claimLabel: { fontSize: 13, fontWeight: '700', color: '#616c39' },
});
