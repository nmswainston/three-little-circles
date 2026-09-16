import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

interface ProgressRingProps {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

/** A circular progress indicator. Draws only the track when progress is 0. */
export default function ProgressRing({
  progress,
  size = 28,
  strokeWidth = 4,
  color,
  trackColor,
}: ProgressRingProps) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor ?? t.colors.track}
        strokeWidth={strokeWidth}
      />
      {clamped > 0 && (
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color ?? t.colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
    </Svg>
  );
}
