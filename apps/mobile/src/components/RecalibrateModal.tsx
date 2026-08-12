import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { VoraApiError } from '@vora/api-client';
import { client } from '../lib/voraClient';
import TrunkMarker, { type TrunkMarkerPoints } from './TrunkMarker';

interface RecalibrateModalProps {
  visible: boolean;
  scanId: number;
  imageUri: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 2D recalibration: re-derive DBH/height from two fresh trunk-base/top clicks
 * on the scan's saved reference photo (thumbnail_url). Reuses the same
 * TrunkMarker component as the initial marking step (ScanMarkingScreen).
 * Calls PATCH /scan/{id}/recalculate — matches the web app's "Recalibrate
 * Trunk (2D Photo)" modal.
 */
export default function RecalibrateModal({ visible, scanId, imageUri, onClose, onSuccess }: RecalibrateModalProps) {
  const [points, setPoints] = useState<TrunkMarkerPoints | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!points) return;
    setIsSubmitting(true);
    try {
      await client.scans.recalculate(scanId, points);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
      Alert.alert('Recalibration Failed', message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recalibrate Trunk (2D Photo)</Text>
          <Text style={styles.subtitle}>
            Tap the trunk base then the trunk top on this scan's reference photo to redo the scale
            calibration and recompute DBH, height, and carbon.
          </Text>
        </View>

        <TrunkMarker imageUri={imageUri} onChange={setPoints} />

        <TouchableOpacity
          style={[styles.primaryButton, (!points || isSubmitting) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!points || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Recalibration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, paddingBottom: 40, backgroundColor: '#ffffff', flexGrow: 1 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: { backgroundColor: '#9ca3af', opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
});
