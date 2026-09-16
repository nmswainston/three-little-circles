import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { day, night, Theme, ParkPalette } from './themes';
import { parkKeyFor } from './parks';
import { useSettingsStore } from '../store/useSettingsStore';

export type { Theme } from './themes';

const ThemeContext = createContext<Theme>(day);

/**
 * Picks day or night from the persisted appearance setting, following the
 * system scheme when the setting is "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const appearance = useSettingsStore((s) => s.appearance);

  const theme = useMemo(() => {
    const wantNight = appearance === 'night' || (appearance === 'system' && system === 'dark');
    return wantNight ? night : day;
  }, [appearance, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Memoizes a StyleSheet factory against the current theme.
 *
 *   const createStyles = (t: Theme) => StyleSheet.create({ ... });
 *   const styles = useStyles(createStyles);
 */
export function useStyles<T>(factory: (t: Theme) => T): T {
  const t = useTheme();
  return useMemo(() => factory(t), [factory, t]);
}

/** Accent palette for a park id in the current theme. */
export function useParkPalette(parkId: string | undefined): ParkPalette {
  const t = useTheme();
  return t.parks[parkKeyFor(parkId)];
}
