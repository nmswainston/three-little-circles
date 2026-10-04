import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import Confetti from '../src/components/ui/Confetti';
import { useReducedMotion } from '../src/lib/useReducedMotion';
import { MAX_SCALE, useScaledSize } from '../src/lib/useScaledSize';

const mockDimensions = { fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockDimensions.fontScale }),
}));

function reduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
}

afterEach(() => {
  jest.restoreAllMocks();
  mockDimensions.fontScale = 1;
});

describe('useReducedMotion', () => {
  it('is false until the device says otherwise', async () => {
    reduceMotion(false);
    const { result } = renderHook(() => useReducedMotion());
    await act(async () => {});
    expect(result.current).toBe(false);
  });

  it('turns on when the device setting is on', async () => {
    reduceMotion(true);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });
});

describe('Confetti', () => {
  it('draws pieces by default', () => {
    reduceMotion(false);
    const { toJSON } = render(<Confetti colors={['#fff']} />);
    expect(toJSON()).not.toBeNull();
  });

  it('draws nothing when reduced motion is on', async () => {
    reduceMotion(true);
    const { toJSON } = render(<Confetti colors={['#fff']} />);
    await waitFor(() => expect(toJSON()).toBeNull());
  });
});

describe('useScaledSize', () => {
  it('keeps the base size at normal text size', () => {
    expect(renderHook(() => useScaledSize(100)).result.current).toBe(100);
  });

  it('grows with text size and stops at the cap', () => {
    mockDimensions.fontScale = 1.2;
    expect(renderHook(() => useScaledSize(100)).result.current).toBe(120);
    mockDimensions.fontScale = 3;
    expect(renderHook(() => useScaledSize(100)).result.current).toBe(Math.round(100 * MAX_SCALE));
  });

  it('never shrinks below the base size', () => {
    mockDimensions.fontScale = 0.8;
    expect(renderHook(() => useScaledSize(76)).result.current).toBe(76);
  });
});
