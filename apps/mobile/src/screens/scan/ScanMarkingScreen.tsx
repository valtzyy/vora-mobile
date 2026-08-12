import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { API_BASE_URL } from '../../lib/config';
import TrunkMarker, { type TrunkMarkerPoints } from '../../components/TrunkMarker';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanMarking'>;
type Route = RouteProp<ScanStackParamList, 'ScanMarking'>;

export default function ScanMarkingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { treeCode: initialTreeCode, removeBackground } = route.params;

  const [points, setPoints] = useState<TrunkMarkerPoints | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const frameUrl = `${API_BASE_URL}/frames/0000.jpg?t=${Date.now()}`;

  const startReconstruct = async (usePoints: boolean) => {
    setIsSubmitting(true);
    try {
      // GPS is intentionally omitted here — the web app doesn't capture it
      // at this step either; the backend defaults to null either way.
      const response = await client.pipeline.startReconstruct({
        tree_code: initialTreeCode,
        remove_background: removeBackground,
        ...(usePoints && points
          ? { p1: points.p1, p2: points.p2, width: points.width, height: points.height }
          : {}),
      });

      navigation.replace('ScanProcessing', { treeCode: response.tree_code });
    } catch (err) {
      console.error('Start reconstruct error:', err);
      Alert.alert('Could Not Start Reconstruction', (err as Error)?.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Mark Trunk Axis</Text>
          <Text style={styles.subtitle}>
            Tap the base of the trunk, then the top of the visible trunk. This calibrates the real-world scale of
            the 3D reconstruction. You can also skip this and let auto-detection handle it.
          </Text>
        </View>

        <TrunkMarker imageUri={frameUrl} onChange={setPoints} />

        <TouchableOpacity
          style={[styles.primaryButton, (!points || isSubmitting) && styles.buttonDisabled]}
          onPress={() => startReconstruct(true)}
          disabled={!points || isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Starting...' : 'Use Selected Points'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => startReconstruct(false)}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Skip & Auto-Detect</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
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
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
