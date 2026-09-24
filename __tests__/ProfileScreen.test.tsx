import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileScreen from '../src/screens/ProfileScreen';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: () => {},
}));

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], seen: [] });
  delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
});

describe('ProfileScreen feedback', () => {
  it('has no feedback section when the build carries no address', () => {
    render(<ProfileScreen />);
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
    expect(screen.queryByText('Feedback')).toBeNull();
  });

  it('opens a prefilled email to the configured address', () => {
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = 'beta@example.com';
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));
    expect(openURL).toHaveBeenCalledTimes(1);
    const url = openURL.mock.calls[0][0];
    expect(url.startsWith('mailto:beta@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Three Little Circles feedback');
    openURL.mockRestore();
  });
});
