import React from 'react';
import Svg, { G, Path, Rect, Circle } from 'react-native-svg';

/**
 * Branded marks for the two "New Scan" video sources, replacing the generic
 * 📸 / 📁 emoji that used to sit there.
 *
 * Both are built from the same Vora glyph as assets/logo-mark.png — the sharp
 * diagonal "V" stroke paired with a leaf sweeping down to meet its point — so
 * the two buttons read as one family rather than as stock iconography. Only
 * the surrounding container differs, and that's what carries the meaning:
 * a viewfinder for capturing something new, a document for importing
 * something that already exists.
 */

const MOSS = '#616c39';

/** The shared Vora V+leaf glyph, drawn in its own 24x24 space. */
function VoraGlyph({ color }: { color: string }) {
  return (
    <G>
      {/* Left arm of the V — a tapered slab falling to the base point */}
      <Path d="M5.4 3.8 L8.5 3.7 L12.9 20.3 L10.6 20.7 Z" fill={color} />
      {/* Leaf — curls from the upper right down into the base of the V */}
      <Path
        d="M18.7 4.0 C19.4 9.6 17.9 13.4 14.6 15.7 C12.5 17.2 11.5 18.9 11.3 21.0 C10.4 15.5 12.1 10.3 15.8 7.7 C17.2 6.7 18.2 5.5 18.7 4.0 Z"
        fill={color}
      />
    </G>
  );
}

interface LogoProps {
  size?: number;
  color?: string;
}

/** Record Camera — the glyph framed by a viewfinder, with a live record dot. */
export function VoraCaptureLogo({ size = 38, color = MOSS }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Viewfinder brackets */}
      <G stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.45}>
        <Path d="M3.5 13 V7.5 A4 4 0 0 1 7.5 3.5 H13" />
        <Path d="M35 3.5 H40.5 A4 4 0 0 1 44.5 7.5 V13" />
        <Path d="M44.5 35 V40.5 A4 4 0 0 1 40.5 44.5 H35" />
        <Path d="M13 44.5 H7.5 A4 4 0 0 1 3.5 40.5 V35" />
      </G>
      {/* Recording indicator */}
      <Circle cx={39.5} cy={8.5} r={3.2} fill={color} />
      <G transform="translate(11.4, 11.4) scale(1.05)">
        <VoraGlyph color={color} />
      </G>
    </Svg>
  );
}

/** Choose File — the glyph resting on a document with a folded corner. */
export function VoraImportLogo({ size = 38, color = MOSS }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Document body, its top-right corner folded away */}
      <Path
        d="M9.5 6.5 A3 3 0 0 1 12.5 3.5 H29 L38.5 13 V41.5 A3 3 0 0 1 35.5 44.5 H12.5 A3 3 0 0 1 9.5 41.5 Z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
        fill="none"
        opacity={0.45}
      />
      {/* The fold itself */}
      <Path
        d="M28.5 3.8 V13 H38"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.45}
      />
      <G transform="translate(14, 17) scale(0.85)">
        <VoraGlyph color={color} />
      </G>
    </Svg>
  );
}

/** Small standalone Vora mark, e.g. for headers. */
export function VoraMark({ size = 24, color = MOSS }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <VoraGlyph color={color} />
    </Svg>
  );
}
