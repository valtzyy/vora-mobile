import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VoraApiError } from '@vora/api-client';
import type { PlotsStackParamList } from '../../navigation/types';
import { client } from '../../lib/voraClient';
import { useSettings } from '../../lib/i18n';

type Nav = NativeStackNavigationProp<PlotsStackParamList, 'CreatePlot'>;

export default function CreatePlotScreen() {
  const { t } = useSettings();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [targetCo2e, setTargetCo2e] = useState('');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('plot.locationPermission'), t('plot.locationPermissionMsg'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch (err) {
      Alert.alert(t('plot.couldNotGetLocation'), (err as Error)?.message || t('common.tryAgain'));
    } finally {
      setIsLocating(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t('plot.nameRequired'), t('plot.nameRequiredMsg'));
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedTarget = targetCo2e.trim() ? parseFloat(targetCo2e) : undefined;
      const result = await client.plots.create({
        name: name.trim(),
        description: description.trim() || undefined,
        privacy: isPublic ? 'public' : 'private',
        target_co2e_kg: parsedTarget && !Number.isNaN(parsedTarget) ? parsedTarget : undefined,
        gps_centroid_lat: gps?.lat,
        gps_centroid_lon: gps?.lon,
      });
      navigation.replace('PlotDetail', { plotCode: result.plot_code });
    } catch (err) {
      const message = err instanceof VoraApiError ? err.detail : (err as Error)?.message;
      Alert.alert(t('plot.couldNotCreate'), message || t('common.tryAgain'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('plot.createTitle')}</Text>
        <Text style={styles.subtitle}>Group trees together — a garden, a plantation, a research site.</Text>

        <Text style={styles.fieldLabel}>{t('plot.name')}</Text>
        <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder={t('plot.namePlaceholder')} />

        <Text style={styles.fieldLabel}>{t('plot.descriptionOptional')}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('plot.descriptionPlaceholder')}
          multiline
          numberOfLines={3}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{t('plot.public')}</Text>
            <Text style={styles.fieldHint}>{t('plot.publicHint')}</Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <Text style={styles.fieldLabel}>{t('plot.targetCo2eOptional')}</Text>
        <TextInput
          style={styles.textInput}
          value={targetCo2e}
          onChangeText={setTargetCo2e}
          placeholder="e.g. 5000"
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>{t('plot.gpsCentroid')}</Text>
        {gps ? (
          <Text style={styles.gpsValue}>{gps.lat.toFixed(4)}°, {gps.lon.toFixed(4)}°</Text>
        ) : (
          <Text style={styles.fieldHint}>{t('plot.noLocation')}</Text>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={useCurrentLocation} disabled={isLocating}>
          {isLocating ? (
            <ActivityIndicator size="small" color="#44403c" />
          ) : (
            <Text style={styles.secondaryButtonText}>{t('plot.useCurrentLocation')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('plot.createTitle')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1c1917', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#78716c', marginBottom: 24, lineHeight: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#a8a29e', marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1c1917',
    marginBottom: 18,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  gpsValue: { fontSize: 14, color: '#616c39', fontWeight: '600', marginBottom: 8 },
  secondaryButton: {
    backgroundColor: '#f5f5f4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: { color: '#44403c', fontSize: 13, fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#616c39',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
