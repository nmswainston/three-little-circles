import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Polygon, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

const RAY_COUNT = 16;
/** Stars stay in the side gutters (the headers' horizontal padding) so they never sit on text or buttons. */
const GUTTER = 22;
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => i * (360 / RAY_COUNT));

interface SunburstProps {
  /** Ray color. Defaults to gold by day, cream by night. */
  color?: string;
  /** Defaults to a soft wash by day and a whisper by night. */
  opacity?: number;
  /** Where the rays radiate from, relative to the parent's top-left corner. */
  center?: { x: number; y: number };
}

/**
 * Vintage-poster rays fanning out from a point above the header. Place inside
 * a parent with position: relative and overflow: hidden. By night the rays go
 * quiet and a scatter of colored stars takes over.
 */
export default function Sunburst({ color, opacity, center = { x: 195, y: -190 } }: SunburstProps) {
  const t = useTheme();
  const size = 800;
  const rayColor = color ?? (t.dark ? t.colors.text : t.colors.primary);
  const rayOpacity = opacity ?? (t.dark ? 0.07 : 0.32);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', left: center.x - size / 2, top: center.y - size / 2 }}
      >
        <G fill={rayColor} fillOpacity={rayOpacity} transform={`translate(${size / 2} ${size / 2})`}>
          {RAYS.map((angle) => (
            <Polygon key={angle} points="0,0 -26,-560 26,-560" transform={`rotate(${angle})`} />
          ))}
        </G>
      </Svg>
      {t.dark && (
        <>
          <Svg width={GUTTER} height={170} viewBox={`0 0 ${GUTTER} 170`} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Circle cx="10" cy="22" r="2.5" fill={t.colors.primary} />
            <Circle cx="14" cy="78" r="1.4" fill={t.colors.text} />
            <Circle cx="8" cy="134" r="1.6" fill={t.parks.kingdom.accent} />
          </Svg>
          <Svg width={GUTTER} height={170} viewBox={`0 0 ${GUTTER} 170`} style={{ position: 'absolute', right: 0, top: 0 }}>
            <Circle cx="12" cy="12" r="1.6" fill={t.colors.text} />
            <Circle cx="9" cy="62" r="2" fill={t.parks.springs.accent} />
            <Circle cx="14" cy="112" r="2.4" fill={t.parks.studios.accent} />
            <Circle cx="10" cy="156" r="1.6" fill={t.colors.primary} />
          </Svg>
        </>
      )}
    </View>
  );
}
