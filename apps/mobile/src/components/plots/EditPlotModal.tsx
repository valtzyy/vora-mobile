import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import type { Plot } from '@vora/types';
import { VoraApiError } from '@vora/api-client';
import { client } from '../../lib/voraClient';

interface EditPlotModalProps {
  visible: boolean;
  plot: Plot;
  onClose: () => void;
  onSaved: () => void;
}

/** Owner-only plot metadata editor — PATCH /plots/{id}. */
export default function EditPlotModal({ visible, plot, onClose, onSaved }: EditPlotModalProps) {
  const [name, setName] = useState(plot.name);
  const [description, setDescription] = useState(plot.description ?? '');
  const [isPublic, setIsPublic] = useState(plot.privacy === 'public');
  const [targetCo2e, setTargetCo2e] = useState(plot.target_co2e_kg != null ? String(plot.target_co2e_kg) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(plot.name);
      setDescription(plot.description ?? '');
      setIsPublic(plot.privacy === 'public');
      setTargetCo2e(plot.target_co2e_kg != null ? String(plot.target_co2e_kg) : '');
    }
  }, [visible, plot]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Plot name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedTarget = targetCo2e.trim() ? parseFloat(targetCo2e) : undefined;
      await client.plots.update(plot.id, {
        name: name.trim(),
        description: description.trim(),
        privacy: isPublic ? 'public' : 'private',
        target_co2e_kg: parsedTarget && !Number.isNaN(parsedTarget) ? parsedTarget : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
      Alert.alert('Could Not Save Changes', message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Plot</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.textInput} value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Public</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>

            <Text style={styles.fieldLabel}>Target CO2e (kg)</Text>
            <TextInput
              style={styles.textInput}
              value={targetCo2e}
              onChangeText={setTargetCo2e}
              keyboardType="numeric"
            />

            <TouchableOpacity style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]} onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  primaryButton: { backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelButtonText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
});
