import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { API_BASE_URL } from '../../lib/config';
import TrunkMarker, { type TrunkMarkerPoints } from '../../components/TrunkMarker';
import { useSettings } from '../../lib/i18n';

type Nav = NativeStackNavigationProp<ScanStackParamList, 'ScanMarking'>;
type Route = RouteProp<ScanStackParamList, 'ScanMarking'>;

export default function ScanMarkingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { t } = useSettings();
  const { treeCode: initialTreeCode, removeBackground } = route.params;

  const [points, setPoints] = useState<TrunkMarkerPoints | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Must stay stable across re-renders. Recomputing this on every render
  // (e.g. with a bare `Date.now()` at the top of the function body) gives
  // TrunkMarker a "new" imageUri every time its own onChange fires — which
  // is exactly what happens right after the 2nd tap completes a selection.
  // TrunkMarker treats any imageUri change as a new frame and resets itself
  // (clears taps, hides the image, calls onChange(null)), wiping the
  // selection the instant it's made and leaving "Use Selected Points"
  // permanently disabled.
  const [frameUrl] = useState(() => `${API_BASE_URL}/frames/0000.jpg?t=${Date.now()}`);

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
      Alert.alert(t('mark.couldNotStart'), (err as Error)?.message || t('common.tryAgain'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('mark.title')}</Text>
          <Text style={styles.subtitle}>
            {t('mark.subtitle')}
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
            {isSubmitting ? t('mark.starting') : t('mark.usePoints')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => startReconstruct(false)}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>{t('mark.skip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1c1917', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#78716c', lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#616c39',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: { backgroundColor: '#a8a29e', opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#f5f5f4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { color: '#44403c', fontSize: 15, fontWeight: '600' },
});
