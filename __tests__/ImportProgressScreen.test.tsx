import React from 'react';
import { Alert, AlertButton } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ImportProgressScreen from '../src/screens/ImportProgressScreen';
import { backupToText, buildBackup } from '../src/lib/backup';
import { STILL_LOADING_MESSAGE } from '../src/store/backup';
import { getAllEntries } from '../src/data/query';
import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useConfirmationsStore } from '../src/store/useConfirmationsStore';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

const mockGetStringAsync = jest.fn<Promise<string>, []>();
jest.mock('expo-clipboard', () => ({ getStringAsync: () => mockGetStringAsync() }));

const NOW = Date.parse('2026-09-22T12:00:00Z');
const [onThisPhone, onlyInBackup] = getAllEntries();

// The other phone found two entries; this phone already has one of them.
const message = backupToText(
  buildBackup(
    {
      found: { [onThisPhone.id]: NOW - 9000, [onlyInBackup.id]: NOW - 8000 },
      achievements: { unlocked: ['FIRST_FIND'], earnedAt: { FIRST_FIND: NOW - 9000 }, seen: ['FIRST_FIND'] },
      settings: { appearance: 'night', mapType: 'hybrid', hideFound: true, hintMode: false },
      reports: {},
    },
    NOW
  )
);

let alertSpy: jest.SpyInstance;

beforeAll(async () => {
  await Promise.all([useFoundStore, useAchievementsStore, useSettingsStore, useConfirmationsStore].map((s) => s.persist.rehydrate()));
});

beforeEach(() => {
  mockGoBack.mockClear();
  mockGetStringAsync.mockReset();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useFoundStore.setState({ found: { [onThisPhone.id]: NOW - 1000 } });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
  useSettingsStore.setState({ appearance: 'system', mapType: 'standard', hideFound: false, hintMode: true });
  useConfirmationsStore.setState({ reported: {} });
});

afterEach(() => {
  alertSpy.mockRestore();
});

const pasteBox = () => screen.getByLabelText('Backup message');

describe('ImportProgressScreen', () => {
  it('starts with an empty box and no preview', () => {
    render(<ImportProgressScreen />);
    expect(pasteBox()).toBeTruthy();
    expect(screen.queryByText('Merge into this phone')).toBeNull();
  });

  it('explains a paste that is not a backup instead of offering to apply it', () => {
    render(<ImportProgressScreen />);
    fireEvent.changeText(pasteBox(), 'see you at the park');
    expect(screen.getByText("That doesn't look like a Three Little Circles backup.")).toBeTruthy();
    expect(screen.queryByText('Merge into this phone')).toBeNull();

    fireEvent.changeText(pasteBox(), message.slice(0, message.length - 20));
    expect(screen.getByText('The backup code is incomplete or damaged. Paste the whole message.')).toBeTruthy();
    expect(screen.queryByText('Merge into this phone')).toBeNull();
  });

  it('previews what is in the backup, counting what is new to this phone', () => {
    render(<ImportProgressScreen />);
    fireEvent.changeText(pasteBox(), message);
    expect(screen.getByText('Backup from 2026-09-22')).toBeTruthy();
    expect(screen.getByText('2 finds')).toBeTruthy();
    expect(screen.getByText('1 new to this phone')).toBeTruthy();
    expect(screen.getByText('1 badge')).toBeTruthy();
    expect(screen.getByText('Settings included')).toBeTruthy();
    expect(screen.getByText('Applied only if you replace')).toBeTruthy();
    expect(useFoundStore.getState().found).toEqual({ [onThisPhone.id]: NOW - 1000 });
  });

  it('merge adds the new find, keeps this phone\'s settings, and offers a way back', () => {
    render(<ImportProgressScreen />);
    fireEvent.changeText(pasteBox(), message);
    fireEvent.press(screen.getByText('Merge into this phone'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Imported')).toBeTruthy();
    expect(screen.getByText('1 new find added, and badges and reports merged in.')).toBeTruthy();

    const found = useFoundStore.getState().found;
    expect(found[onThisPhone.id]).toBe(NOW - 9000); // the earlier date wins
    expect(found[onlyInBackup.id]).toBe(NOW - 8000);
    expect(useAchievementsStore.getState().unlocked).toContain('FIRST_FIND');
    expect(useSettingsStore.getState().hintMode).toBe(true);
    expect(useSettingsStore.getState().appearance).toBe('system');

    fireEvent.press(screen.getByText('Done'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('replace asks first, then makes this phone match the backup, settings included', () => {
    render(<ImportProgressScreen />);
    fireEvent.changeText(pasteBox(), message);

    // Cancel: nothing changes.
    alertSpy.mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((b) => b.style === 'cancel')?.onPress?.();
    });
    fireEvent.press(screen.getByText('Replace everything'));
    expect(alertSpy).toHaveBeenCalledWith('Replace everything?', expect.stringContaining("can't be undone"), expect.any(Array));
    expect(screen.queryByText('Imported')).toBeNull();
    expect(useSettingsStore.getState().hintMode).toBe(true);

    // Confirm: the phone becomes the backup.
    alertSpy.mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(screen.getByText('Replace everything'));
    expect(screen.getByText('This phone now matches the backup: 2 finds.')).toBeTruthy();
    expect(useFoundStore.getState().found).toEqual({ [onThisPhone.id]: NOW - 9000, [onlyInBackup.id]: NOW - 8000 });
    expect(useSettingsStore.getState()).toMatchObject({ appearance: 'night', mapType: 'hybrid', hideFound: true, hintMode: false });
  });

  it('fills the box from the clipboard', async () => {
    mockGetStringAsync.mockResolvedValue(message);
    render(<ImportProgressScreen />);
    fireEvent.press(screen.getByText('Paste from clipboard'));
    expect(await screen.findByText('2 finds')).toBeTruthy();
  });

  it('says so when the clipboard is empty', async () => {
    mockGetStringAsync.mockResolvedValue('   ');
    render(<ImportProgressScreen />);
    fireEvent.press(screen.getByText('Paste from clipboard'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Nothing to paste', expect.any(String)));
    expect(screen.queryByText('2 finds')).toBeNull();
  });

  it('refuses to apply anything before the stores have loaded', () => {
    const hydrated = jest.spyOn(useFoundStore.persist, 'hasHydrated').mockReturnValue(false);
    try {
      render(<ImportProgressScreen />);
      fireEvent.changeText(pasteBox(), message);
      fireEvent.press(screen.getByText('Merge into this phone'));
      expect(alertSpy).toHaveBeenCalledWith('Still loading', STILL_LOADING_MESSAGE);
      expect(screen.queryByText('Imported')).toBeNull();
      expect(useFoundStore.getState().found).toEqual({ [onThisPhone.id]: NOW - 1000 });
    } finally {
      hydrated.mockRestore();
    }
  });
});
