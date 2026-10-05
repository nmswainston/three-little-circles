import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SubmitSightingScreen from '../src/screens/SubmitSightingScreen';
import { getAllEntries } from '../src/data/query';
import { useSettingsStore } from '../src/store/useSettingsStore';

let mockParams: { parkId?: string; forEntryId?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }] })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
}));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => {}), NotificationFeedbackType: { Success: 'success' } }));
const mockSubmit = jest.fn(async (_input: unknown, _deviceId: string) => ({ ok: true as const }));
jest.mock('../src/lib/submissions', () => ({
  ...jest.requireActual('../src/lib/submissions'),
  submitSighting: (input: unknown, deviceId: string) => mockSubmit(input, deviceId),
}));

const entry = getAllEntries().find((e) => e.display?.entryTitle && e.display?.attractionName)!;

beforeAll(async () => {
  await useSettingsStore.persist.rehydrate();
});
beforeEach(() => {
  mockSubmit.mockClear();
});

describe('SubmitSightingScreen for a photo of a find in the guide', () => {
  beforeEach(() => {
    mockParams = { forEntryId: entry.id };
  });

  it('names the find and drops the fields the entry already answers', () => {
    render(<SubmitSightingScreen />);
    expect(screen.getByRole('header', { name: 'Send a photo' })).toBeTruthy();
    expect(screen.getByText(entry.display!.entryTitle!)).toBeTruthy();
    expect(screen.queryByText('Park or resort')).toBeNull();
    expect(screen.queryByLabelText('Short title')).toBeNull();
    expect(screen.queryByLabelText('Where to look')).toBeNull();
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send photo' })).toBeTruthy();
  });

  it('refuses to send without a photo', async () => {
    render(<SubmitSightingScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Send photo' }));
    expect(await screen.findByText('Add a photo of the find.')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('sends the photo, the note, and the entry id, then offers no second go', async () => {
    render(<SubmitSightingScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    expect(await screen.findByLabelText('Attached photo')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Note'), 'Look up and left of the door.');
    fireEvent.press(screen.getByRole('button', { name: 'Send photo' }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        forEntryId: entry.id,
        whereToLook: 'Look up and left of the door.',
        photo: { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' },
      })
    );
    expect(await screen.findByText("Thanks, we'll take a look")).toBeTruthy();
    expect(screen.queryByText('Suggest another')).toBeNull();
  });
});

describe('SubmitSightingScreen for a new find', () => {
  beforeEach(() => {
    mockParams = undefined;
  });

  it('still asks for the park and where to look', () => {
    render(<SubmitSightingScreen />);
    expect(screen.getByRole('header', { name: 'Suggest a find' })).toBeTruthy();
    expect(screen.getByText('Park or resort')).toBeTruthy();
    expect(screen.getByLabelText('Where to look')).toBeTruthy();
    expect(screen.queryByLabelText('Note')).toBeNull();
    expect(screen.getByRole('button', { name: 'Send suggestion' })).toBeTruthy();
  });
});
