import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import EntryDetailScreen from '../src/screens/EntryDetailScreen';
import { getAllEntries } from '../src/data/query';
import * as query from '../src/data/query';
import type { HiddenMickeyEntry } from '../src/data/types';
import { labelOrFallback } from '../src/data/labels';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useConfirmationsStore } from '../src/store/useConfirmationsStore';
import { useRecentStore } from '../src/store/useRecentStore';
import * as confirmations from '../src/data/confirmations';

// A find with a scene, a tip, an exact spot, and no orientation, so the
// ladder is the free scene plus two hints: the tip, then the exact spot.
const entry = getAllEntries().find(
  (e) => e.whereToLook.scene && e.whereToLook.exactSpot && e.bestTip && !e.whereToLook.orientation
)!;
// A find with no tip, whose ladder is the scene plus the exact spot alone.
const tipless = getAllEntries().find((e) => !e.bestTip && !e.whereToLook.orientation);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { entryId: mockEntryId } }),
}));
let mockEntryId = '';

// Tests run without the reporting backend configured. The screen reads the
// flag at render time, so a test can flip it on the mocked module.
jest.mock('../src/lib/supabase', () => ({ ...jest.requireActual('../src/lib/supabase'), isSupabaseConfigured: true }));
const reports = jest.requireMock('../src/lib/supabase') as { isSupabaseConfigured: boolean };

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
  await useConfirmationsStore.persist.rehydrate();
});

beforeEach(() => {
  mockEntryId = entry.id;
  reports.isSupabaseConfigured = true;
  useFoundStore.setState({ found: {} });
  useConfirmationsStore.setState({ reported: {} });
  useSettingsStore.getState().setHintMode(true);
});

describe('EntryDetailScreen hints', () => {
  it('shows the scene up front and keeps the tip and exact spot for later', () => {
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.queryByText(entry.bestTip!)).toBeNull();
    expect(screen.queryByText(entry.whereToLook.exactSpot)).toBeNull();
    expect(screen.getByText('0 of 2 hints')).toBeTruthy();
  });

  it('opens the tip first, then the exact spot', () => {
    render(<EntryDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(screen.getByText(entry.bestTip!)).toBeTruthy();
    expect(screen.queryByText(entry.whereToLook.exactSpot)).toBeNull();
    expect(screen.getByText('1 of 2 hints')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Show the next hint' }));
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
    expect(screen.queryByText(/of 2 hints/)).toBeNull();
  });

  it('shows the tip only once, inside where to look', () => {
    useSettingsStore.getState().setHintMode(false);
    render(<EntryDetailScreen />);
    expect(screen.getAllByText(entry.bestTip!)).toHaveLength(1);
    expect(screen.getByText('Tip')).toBeTruthy();
  });

  it('shows everything at once with hints off', () => {
    useSettingsStore.getState().setHintMode(false);
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.getByText(entry.bestTip!)).toBeTruthy();
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
  });

  it('goes straight from the scene to the exact spot when a find has no tip', () => {
    if (!tipless) return;
    mockEntryId = tipless.id;
    render(<EntryDetailScreen />);
    expect(screen.getByText('0 of 1 hint')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(screen.getByText(tipless.whereToLook.exactSpot)).toBeTruthy();
  });
});

const VIEWING_KEYS = ['motion', 'lighting', 'angle', 'crowding', 'distance'] as const;

describe('EntryDetailScreen last viewed', () => {
  it('remembers the find it shows, for the Parks home to pick up from', () => {
    useRecentStore.setState({ lastEntryId: undefined });
    render(<EntryDetailScreen />);
    expect(useRecentStore.getState().lastEntryId).toBe(entry.id);
  });
});

describe('EntryDetailScreen accessibility', () => {
  it('marks the title as a header', () => {
    render(<EntryDetailScreen />);
    expect(screen.getByRole('header', { name: labelOrFallback(entry.display?.entryTitle, 'Hidden Find') })).toBeTruthy();
  });

  it('labels the map buttons when the find has a pin', () => {
    const pinned = getAllEntries().find((e) => e.coordinates)!;
    mockEntryId = pinned.id;
    render(<EntryDetailScreen />);
    expect(screen.getByRole('button', { name: 'See on map' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Get directions' })).toBeTruthy();
  });

  it('reads each viewing condition as one labelled tile under a header', () => {
    const detailed = getAllEntries().find((e) => e.viewing && VIEWING_KEYS.some((k) => e.viewing?.[k]))!;
    const key = VIEWING_KEYS.find((k) => detailed.viewing?.[k])!;
    mockEntryId = detailed.id;
    render(<EntryDetailScreen />);
    expect(screen.getByRole('header', { name: 'Viewing conditions' })).toBeTruthy();
    expect(screen.getByLabelText(`${key[0].toUpperCase()}${key.slice(1)}: ${detailed.viewing![key]}`)).toBeTruthy();
  });

  it('says what the key icon means on an access note', () => {
    const gated = getAllEntries().find((e) => e.accessNotes);
    if (!gated) return;
    mockEntryId = gated.id;
    render(<EntryDetailScreen />);
    expect(screen.getByLabelText(`Access note: ${gated.accessNotes}`)).toBeTruthy();
  });
});

const UNCONFIRMED_NOTE = "No one has confirmed this one yet. Found it? Tap 'Saw it today' below so others know.";

describe('EntryDetailScreen unconfirmed finds', () => {
  const unconfirmed = getAllEntries().find((e) => e.status === 'Unverified')!;
  const current = getAllEntries().find((e) => e.status === 'Current')!;

  it('labels an unconfirmed find and asks the guest to report it', () => {
    mockEntryId = unconfirmed.id;
    render(<EntryDetailScreen />);
    expect(screen.getByText('Not confirmed yet')).toBeTruthy();
    expect(screen.getByText(UNCONFIRMED_NOTE)).toBeTruthy();
  });

  it('shows neither on a confirmed find', () => {
    mockEntryId = current.id;
    render(<EntryDetailScreen />);
    expect(screen.queryByText('Not confirmed yet')).toBeNull();
    expect(screen.queryByText(UNCONFIRMED_NOTE)).toBeNull();
  });

  it('drops the ask once this device has reported, but keeps the label', () => {
    mockEntryId = unconfirmed.id;
    useConfirmationsStore.setState({ reported: { [unconfirmed.id]: { status: 'seen', at: Date.now() } } });
    render(<EntryDetailScreen />);
    expect(screen.getByText('Not confirmed yet')).toBeTruthy();
    expect(screen.queryByText(UNCONFIRMED_NOTE)).toBeNull();
  });

  it('keeps the label but drops the ask in a build where reports cannot be sent', () => {
    reports.isSupabaseConfigured = false;
    mockEntryId = unconfirmed.id;
    render(<EntryDetailScreen />);
    expect(screen.getByText('Not confirmed yet')).toBeTruthy();
    expect(screen.queryByText(UNCONFIRMED_NOTE)).toBeNull();
  });

  it('drops both once guest reports confirm the find', () => {
    const spy = jest.spyOn(confirmations, 'isConfirmed').mockReturnValue(true);
    try {
      mockEntryId = unconfirmed.id;
      render(<EntryDetailScreen />);
      expect(screen.queryByText('Not confirmed yet')).toBeNull();
      expect(screen.queryByText(UNCONFIRMED_NOTE)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('EntryDetailScreen provenance row', () => {
  const byVerification = (verification: HiddenMickeyEntry['verification']) =>
    getAllEntries().find((e) => e.verification === verification)!;
  // The icon mock renders the glyph name as text. The icon is hidden from
  // assistive tech on purpose, since the words beside it already say the same.
  const icon = (name: string) => within(screen.getByTestId('provenance')).queryByText(name, { includeHiddenElements: true });

  it('gives an in-person confirmation the checkmark', () => {
    mockEntryId = byVerification('In-person').id;
    render(<EntryDetailScreen />);
    expect(screen.getByText(/Confirmed in person/)).toBeTruthy();
    expect(icon('checkmark-circle')).toBeTruthy();
  });

  it('gives a photo confirmation the checkmark', () => {
    mockEntryId = byVerification('Photo').id;
    render(<EntryDetailScreen />);
    expect(screen.getByText(/Confirmed by photo/)).toBeTruthy();
    expect(icon('checkmark-circle')).toBeTruthy();
  });

  it('marks a community report with people, never a checkmark', () => {
    mockEntryId = byVerification('Community').id;
    render(<EntryDetailScreen />);
    expect(screen.getByText(/Community reported/)).toBeTruthy();
    expect(icon('people-outline')).toBeTruthy();
    expect(icon('checkmark-circle')).toBeNull();
    expect(icon('checkmark')).toBeNull();
  });

  it('marks official documentation with a page, not a checkmark', () => {
    mockEntryId = byVerification('Documented').id;
    render(<EntryDetailScreen />);
    expect(screen.getByText(/Officially documented/)).toBeTruthy();
    expect(icon('document-text-outline')).toBeTruthy();
    expect(icon('checkmark-circle')).toBeNull();
  });

  it('shows a question mark when the verification is unknown', () => {
    const spy = jest.spyOn(query, 'getEntryById').mockReturnValue({ ...entry, verification: 'Unknown' });
    try {
      render(<EntryDetailScreen />);
      expect(screen.getByText(`${entry.confidence} sighting`)).toBeTruthy();
      expect(icon('help-circle-outline')).toBeTruthy();
      expect(icon('checkmark-circle')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
