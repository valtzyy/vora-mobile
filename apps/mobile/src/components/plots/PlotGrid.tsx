import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSettings } from '../../lib/i18n';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import type { ScanRecord } from '@vora/types';

const CELL_SIZE = 28;
const GRID_CELLS = 16; // 16x16 cells, matches web's spirit of a bounded spatial canvas
const GRID_PX = CELL_SIZE * GRID_CELLS;

export interface PlotGridPosition {
  tree_code: string;
  grid_position_x: number;
  grid_position_y: number;
}

interface PlotGridProps {
  scans: ScanRecord[];
  /** Called (debounced by the caller) whenever a tree is dropped in a new cell. */
  onPositionsChange: (positions: PlotGridPosition[]) => void;
  onSelectTree?: (treeCode: string) => void;
}

/**
 * Touch-based replacement for the web app's HTML5 drag-and-drop 24px grid
 * canvas — each tree is an independently draggable chip (react-native-
 * gesture-handler Pan + reanimated shared values) that snaps to the nearest
 * grid cell on release. Trees without a saved position get a deterministic
 * fallback layout (row-major fill) so nothing starts stacked at (0,0).
 */
export default function PlotGrid({ scans, onPositionsChange, onSelectTree }: PlotGridProps) {
  const { t } = useSettings();
  const positionsRef = React.useRef<Map<string, { x: number; y: number }>>(new Map());

  scans.forEach((scan, i) => {
    if (!positionsRef.current.has(scan.tree_code)) {
      const hasSaved = scan.grid_position_x != null && scan.grid_position_y != null;
      positionsRef.current.set(scan.tree_code, {
        x: hasSaved ? (scan.grid_position_x as number) : i % GRID_CELLS,
        y: hasSaved ? (scan.grid_position_y as number) : Math.floor(i / GRID_CELLS),
      });
    }
  });

  const handleDragEnd = useCallback(
    (treeCode: string, cellX: number, cellY: number) => {
      positionsRef.current.set(treeCode, { x: cellX, y: cellY });
      const positions: PlotGridPosition[] = Array.from(positionsRef.current.entries()).map(
        ([tree_code, pos]) => ({ tree_code, grid_position_x: pos.x, grid_position_y: pos.y })
      );
      onPositionsChange(positions);
    },
    [onPositionsChange]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('plot.gridHint')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scrollX}>
        <ScrollView showsVerticalScrollIndicator style={styles.scrollY}>
          <View style={styles.grid}>
            {Array.from({ length: GRID_CELLS + 1 }).map((_, i) => (
              <React.Fragment key={`lines-${i}`}>
                <View style={[styles.gridLineV, { left: i * CELL_SIZE }]} />
                <View style={[styles.gridLineH, { top: i * CELL_SIZE }]} />
              </React.Fragment>
            ))}
            {scans.map((scan) => {
              const pos = positionsRef.current.get(scan.tree_code)!;
              return (
                <React.Fragment key={scan.tree_code}>
                  <TreeChip
                    treeCode={scan.tree_code}
                    initialX={pos.x}
                    initialY={pos.y}
                    onDragEnd={handleDragEnd}
                    onPress={onSelectTree}
                  />
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function TreeChip({
  treeCode,
  initialX,
  initialY,
  onDragEnd,
  onPress,
}: {
  treeCode: string;
  initialX: number;
  initialY: number;
  onDragEnd: (treeCode: string, cellX: number, cellY: number) => void;
  onPress?: (treeCode: string) => void;
}) {
  const translateX = useSharedValue(initialX * CELL_SIZE);
  const translateY = useSharedValue(initialY * CELL_SIZE);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(startX.value + e.translationX, GRID_PX - CELL_SIZE);
      translateY.value = clamp(startY.value + e.translationY, GRID_PX - CELL_SIZE);
    })
    .onEnd(() => {
      const cellX = Math.round(translateX.value / CELL_SIZE);
      const cellY = Math.round(translateY.value / CELL_SIZE);
      translateX.value = cellX * CELL_SIZE;
      translateY.value = cellY * CELL_SIZE;
      runOnJS(onDragEnd)(treeCode, cellX, cellY);
    });

  // RN's strict `transform` union type doesn't structurally match an array of
  // plain { translateX } / { translateY } object literals inferred this way
  // (a well-known Reanimated+TS friction, not a real type mismatch) — cast
  // to sidestep it.
  const animatedStyle = useAnimatedStyle(
    () =>
      ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
      }) as any
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.chip, animatedStyle]}>
        <Pressable onPress={() => onPress?.(treeCode)} hitSlop={4}>
          <Text style={styles.chipText} numberOfLines={1}>
            {treeCode.replace('POHON-', '')}
          </Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  hint: { fontSize: 12, color: '#a8a29e', marginBottom: 8 },
  scrollX: { maxHeight: 320, borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4' },
  scrollY: { maxHeight: 320 },
  grid: {
    width: GRID_PX,
    height: GRID_PX,
    backgroundColor: '#fafaf9',
  },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#e7e5e4' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#e7e5e4' },
  chip: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: '#616c39',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chipText: { color: '#ffffff', fontSize: 8, fontWeight: '700' },
});
