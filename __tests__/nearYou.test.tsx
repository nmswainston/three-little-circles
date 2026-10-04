import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getAllEntries } from '../src/data/query';
import { findNearYou, NEAR_YOU_RANGE_METERS } from '../src/lib/nearYou';
import NearYouCard from '../src/components/NearYouCard';

const pinned = getAllEntries().filter((e) => e.coordinates);
const standingOn = pinned[0];
const origin = standingOn.coordinates!;
const landEntries = getAllEntries().filter((e) => e.parkId === standingOn.parkId && e.landId === standingOn.landId);

describe('findNearYou', () => {
  it('names the land of the closest find and counts its finds', () => {
    const here = findNearYou(getAllEntries(), origin, {});
    expect(here).toMatchObject({ parkId: standingOn.parkId, landId: standingOn.landId, total: landEntries.length, found: 0 });
  });

  it('counts finds already marked in that land', () => {
    const found = { [landEntries[0].id]: Date.now(), [landEntries[1]?.id ?? 'none']: Date.now() };
    const here = findNearYou(getAllEntries(), origin, found);
    expect(here?.found).toBe(landEntries.length > 1 ? 2 : 1);
  });

  it('says nothing when no find is close enough', () => {
    // About 1.1 km north of the closest pin at any latitude.
    const far = { latitude: origin.latitude + 0.01, longitude: origin.longitude };
    const closest = findNearYou(pinned, far, {});
    // Another pin may sit near that spot, so only assert when none does.
    const anyClose = pinned.some(
      (e) => Math.hypot(e.coordinates!.latitude - far.latitude, e.coordinates!.longitude - far.longitude) < 0.002
    );
    if (!anyClose) expect(closest).toBeUndefined();
    expect(NEAR_YOU_RANGE_METERS).toBeGreaterThan(0);
  });

  it('says nothing for an empty list', () => {
    expect(findNearYou([], origin, {})).toBeUndefined();
  });
});

describe('NearYouCard', () => {
  const here = findNearYou(getAllEntries(), origin, {})!;

  it('shows the land and opens the nearby finds', () => {
    const onShowNearby = jest.fn();
    render(<NearYouCard here={here} canAsk={false} onAsk={jest.fn()} onShowNearby={onShowNearby} />);
    expect(screen.getByText('Show nearby finds')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${landEntries.length} finds? here`))).toBeTruthy();
    fireEvent.press(screen.getByText('Show nearby finds'));
    expect(onShowNearby).toHaveBeenCalled();
  });

  it('invites the guest to turn location on before it is decided', () => {
    const onAsk = jest.fn();
    render(<NearYouCard canAsk onAsk={onAsk} onShowNearby={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Find what is near you. Turn on location.'));
    expect(onAsk).toHaveBeenCalled();
  });

  it('renders nothing when location is off or the guest is outside a park', () => {
    render(<NearYouCard canAsk={false} onAsk={jest.fn()} onShowNearby={jest.fn()} />);
    expect(screen.queryByText("Find what's near you")).toBeNull();
    expect(screen.queryByText('Show nearby finds')).toBeNull();
  });
});
