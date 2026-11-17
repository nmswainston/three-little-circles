import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SubmitSightingScreen from '../src/screens/SubmitSightingScreen';
import { getAllEntries } from '../src/data/query';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { NEW_FIND_DRAFT, photoDraftKey, useDraftStore } from '../src/store/useDraftStore';

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
  await useDraftStore.persist.rehydrate();
});
beforeEach(() => {
  mockSubmit.mockClear();
  useDraftStore.setState({ drafts: {} });
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

describe('unsent drafts', () => {
  beforeEach(() => {
    mockParams = undefined;
  });

  it('keeps what was typed and puts it back on the next visit', async () => {
    const first = render(<SubmitSightingScreen />);
    fireEvent.changeText(screen.getByLabelText('Short title'), 'Queue Cloud Mickey');
    fireEvent.changeText(screen.getByLabelText('Where to look'), 'Second cloud on the left of the queue ceiling.');
    await waitFor(() => expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]?.title).toBe('Queue Cloud Mickey'));
    first.unmount();

    render(<SubmitSightingScreen />);
    await waitFor(() => expect(screen.getByLabelText('Short title').props.value).toBe('Queue Cloud Mickey'));
    expect(screen.getByLabelText('Where to look').props.value).toBe('Second cloud on the left of the queue ceiling.');
    expect(screen.getByText('We kept what you typed last time.')).toBeTruthy();
  });

  it('saves on leaving the screen, without waiting out the delay', () => {
    const view = render(<SubmitSightingScreen />);
    fireEvent.changeText(screen.getByLabelText('Short title'), 'Gone in a flash');
    view.unmount();
    expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]?.title).toBe('Gone in a flash');
  });

  it('does not save a form with nothing typed', async () => {
    render(<SubmitSightingScreen />);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(useDraftStore.getState().drafts).toEqual({});
  });

  it('clears the draft once the suggestion is sent', async () => {
    render(<SubmitSightingScreen />);
    fireEvent.changeText(screen.getByLabelText('Attraction, shop, or spot'), 'Backyard Coaster');
    fireEvent.changeText(screen.getByLabelText('Short title'), 'Queue Cloud Mickey');
    fireEvent.changeText(screen.getByLabelText('Where to look'), 'Second cloud on the left of the queue ceiling.');
    await waitFor(() => expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]).toBeDefined());
    fireEvent.press(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(await screen.findByText("Thanks, we'll take a look")).toBeTruthy();
    expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]).toBeUndefined();
  });

  it('keeps the draft when the send fails', async () => {
    mockSubmit.mockResolvedValueOnce({ ok: false, message: "Couldn't send your suggestion. Check your connection and try again." } as never);
    render(<SubmitSightingScreen />);
    fireEvent.changeText(screen.getByLabelText('Attraction, shop, or spot'), 'Backyard Coaster');
    fireEvent.changeText(screen.getByLabelText('Short title'), 'Queue Cloud Mickey');
    fireEvent.changeText(screen.getByLabelText('Where to look'), 'Second cloud on the left of the queue ceiling.');
    fireEvent.press(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(await screen.findByText(/Check your connection/)).toBeTruthy();
    await waitFor(() => expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]?.title).toBe('Queue Cloud Mickey'));
  });

  it('lets the guest discard a restored draft', async () => {
    useDraftStore.getState().saveDraft(NEW_FIND_DRAFT, {
      parkId: undefined, attraction: 'Old ride', land: '', title: 'Old title', whereToLook: '', difficulty: 'Medium',
      locationType: 'Queue', note: '', contactName: '', creditOk: false,
    });
    render(<SubmitSightingScreen />);
    await waitFor(() => expect(screen.getByLabelText('Short title').props.value).toBe('Old title'));
    fireEvent.press(screen.getByRole('button', { name: 'Discard the saved draft' }));
    expect(screen.getByLabelText('Short title').props.value).toBe('');
    expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]).toBeUndefined();
  });

  it('ignores a draft older than a month', async () => {
    useDraftStore.setState({
      drafts: {
        [NEW_FIND_DRAFT]: {
          attraction: 'Stale', land: '', title: 'Stale title', whereToLook: '', difficulty: 'Medium',
          locationType: 'Queue', note: '', contactName: '', creditOk: false, savedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
        },
      },
    });
    render(<SubmitSightingScreen />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByLabelText('Short title').props.value).toBe('');
  });

  it('keeps a photo note per find', async () => {
    mockParams = { forEntryId: entry.id };
    const view = render(<SubmitSightingScreen />);
    fireEvent.changeText(screen.getByLabelText('Note'), 'Look up and left of the door.');
    view.unmount();
    expect(useDraftStore.getState().drafts[photoDraftKey(entry.id)]?.note).toBe('Look up and left of the door.');
    expect(useDraftStore.getState().drafts[NEW_FIND_DRAFT]).toBeUndefined();
  });
});
