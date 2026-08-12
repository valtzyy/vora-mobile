import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';

export interface TrunkMarkerPoints {
  p1: [number, number];
  p2: [number, number];
  width: number;
  height: number;
}

interface TrunkMarkerProps {
  /** URL of the frame image to tap on (e.g. `${API_BASE_URL}/frames/0000.jpg`). */
  imageUri: string;
  /** Called with the two rescaled points (in the image's natural pixel space) once both taps land, or null after a reset. */
  onChange: (points: TrunkMarkerPoints | null) => void;
}

const MAX_DISPLAY_HEIGHT = 420;

/**
 * Reusable "tap the trunk base then the trunk top" calibration UI.
 * Mirrors the web app's click-2-points-on-an-image pattern
 * (vora-frontend reconstruct/page.tsx): taps are captured in the image's
 * *rendered* (on-screen) size, then rescaled to its *natural* pixel
 * dimensions before being reported via onChange, since that's the pixel
 * space the backend's MASt3R pointmap expects.
 *
 * Used both for initial trunk-axis marking (ScanMarkingScreen) and 2D
 * recalibration (RecalibrateModal).
 */
export default function TrunkMarker({ imageUri, onChange }: TrunkMarkerProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [taps, setTaps] = useState<{ x: number; y: number }[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setTaps([]);
    setDisplaySize(null);
    setLoadError(false);
    onChange(null);
    Image.getSize(
      imageUri,
      (width, height) => setNaturalSize({ width, height }),
      () => setLoadError(true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUri]);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!naturalSize) return;
      const containerWidth = e.nativeEvent.layout.width;
      const scale = Math.min(1, MAX_DISPLAY_HEIGHT / naturalSize.height, containerWidth / naturalSize.width);
      setDisplaySize({
        width: naturalSize.width * scale,
        height: naturalSize.height * scale,
      });
    },
    [naturalSize]
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (!naturalSize || !displaySize || taps.length >= 2) return;
      const { locationX, locationY } = e.nativeEvent;
      const nextTaps = [...taps, { x: locationX, y: locationY }];
      setTaps(nextTaps);

      if (nextTaps.length === 2) {
        const scaleX = naturalSize.width / displaySize.width;
        const scaleY = naturalSize.height / displaySize.height;
        const p1: [number, number] = [nextTaps[0].x * scaleX, nextTaps[0].y * scaleY];
        const p2: [number, number] = [nextTaps[1].x * scaleX, nextTaps[1].y * scaleY];
        onChange({ p1, p2, width: naturalSize.width, height: naturalSize.height });
      }
    },
    [naturalSize, displaySize, taps, onChange]
  );

  const reset = useCallback(() => {
    setTaps([]);
    onChange(null);
  }, [onChange]);

  if (loadError) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.errorText}>Could not load the reference frame.</Text>
      </View>
    );
  }

  if (!naturalSize) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <View>
      <View onLayout={handleLayout} style={styles.imageWrap}>
        {displaySize && (
          <Pressable onPress={handlePress} disabled={taps.length >= 2}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: displaySize.width, height: displaySize.height }}
              resizeMode="contain"
            />
            {taps.map((t, i) => (
              <View key={i} pointerEvents="none" style={[styles.marker, { left: t.x - 12, top: t.y - 12 }]}>
                <Text style={styles.markerText}>{i === 0 ? 'A' : 'B'}</Text>
              </View>
            ))}
            {taps.length === 2 && (
              <View
                pointerEvents="none"
                style={[
                  styles.axisLine,
                  {
                    left: taps[0].x,
                    top: taps[0].y,
                    width: Math.hypot(taps[1].x - taps[0].x, taps[1].y - taps[0].y),
                    transform: [
                      {
                        rotate: `${Math.atan2(taps[1].y - taps[0].y, taps[1].x - taps[0].x)}rad`,
                      },
                    ],
                  },
                ]}
              />
            )}
          </Pressable>
        )}
      </View>
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>
          {taps.length === 0 && 'Tap the base of the trunk (point A)'}
          {taps.length === 1 && 'Now tap the top of the visible trunk (point B)'}
          {taps.length === 2 && '✓ Trunk axis marked'}
        </Text>
        {taps.length > 0 && (
          <Pressable onPress={reset} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  axisLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#16a34a',
    transformOrigin: '0 50%',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  hintText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
  },
  resetText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
});
