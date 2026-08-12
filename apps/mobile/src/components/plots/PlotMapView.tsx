import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { ScanRecord } from '@vora/types';
import { hasScanGPS, formatCO2eCompact } from '@vora/domain';

interface PlotMapViewProps {
  scans: ScanRecord[];
  centroidLat?: number | null;
  centroidLon?: number | null;
  height?: number;
}

/**
 * GPS map view for a plot's trees — mobile equivalent of the web app's
 * Leaflet PlotMap.tsx. Only scans with GPS coordinates get a marker
 * (hasScanGPS() from @vora/domain, same guard the web app uses).
 *
 * Note: react-native-maps is a native module not bundled in Expo Go — this
 * screen requires a custom dev client / EAS build to actually render.
 */
export default function PlotMapView({ scans, centroidLat, centroidLon, height = 280 }: PlotMapViewProps) {
  const geoScans = useMemo(() => scans.filter(hasScanGPS), [scans]);

  const initialRegion = useMemo(() => {
    if (geoScans.length > 0) {
      return {
        latitude: geoScans[0].gps_lat as number,
        longitude: geoScans[0].gps_lon as number,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (centroidLat != null && centroidLon != null) {
      return { latitude: centroidLat, longitude: centroidLon, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    }
    return null;
  }, [geoScans, centroidLat, centroidLon]);

  if (!initialRegion) {
    return (
      <View style={[styles.emptyBox, { height }]}>
        <Text style={styles.emptyText}>No GPS data available for this plot yet.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
      >
        {geoScans.map((scan) => (
          <Marker
            key={scan.tree_code}
            coordinate={{ latitude: scan.gps_lat as number, longitude: scan.gps_lon as number }}
            title={scan.tree_code}
            description={`${formatCO2eCompact(scan.co2e_kg)} · DBH ${scan.dbh_cm?.toFixed(1) ?? '--'} cm`}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  emptyBox: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
