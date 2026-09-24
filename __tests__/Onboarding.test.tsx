import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Onboarding from '../src/components/Onboarding';
import { useSettingsStore } from '../src/store/useSettingsStore';

const FIRST_TITLE = 'Three little circles';

beforeAll(async () => {
  await useSettingsStore.persist.rehydrate();
});

beforeEach(() => {
  useSettingsStore.setState({ onboarded: false });
});

describe('Onboarding', () => {
  it('stays out of the way for an install that has already seen it', () => {
    useSettingsStore.setState({ onboarded: true });
    render(<Onboarding />);
    expect(screen.queryByText(FIRST_TITLE)).toBeNull();
  });

  it('walks a new install through three pages and remembers the finish', () => {
    render(<Onboarding />);
    expect(screen.getByText(FIRST_TITLE)).toBeTruthy();
    expect(screen.getByLabelText('Page 1 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip the intro' })).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByLabelText('Page 2 of 3')).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByLabelText('Page 3 of 3')).toBeTruthy();
    expect(screen.getByText(/Independent fan project/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip the intro' })).toBeNull();
    expect(useSettingsStore.getState().onboarded).toBe(false);

    fireEvent.press(screen.getByText('Start hunting'));
    expect(useSettingsStore.getState().onboarded).toBe(true);
    expect(screen.queryByText(FIRST_TITLE)).toBeNull();
  });

  it('counts a skip as seen', () => {
    render(<Onboarding />);
    fireEvent.press(screen.getByRole('button', { name: 'Skip the intro' }));
    expect(useSettingsStore.getState().onboarded).toBe(true);
    expect(screen.queryByText(FIRST_TITLE)).toBeNull();
  });

  it('comes back when the flag is cleared from Profile', () => {
    useSettingsStore.setState({ onboarded: true });
    render(<Onboarding />);
    expect(screen.queryByText(FIRST_TITLE)).toBeNull();
    // Block body on purpose: the persisted store's setState returns the storage
    // write's promise, and act would treat that as an async callback.
    act(() => {
      useSettingsStore.setState({ onboarded: false });
    });
    expect(screen.getByText(FIRST_TITLE)).toBeTruthy();
  });
});
