import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Chip from '../src/components/ui/Chip';

// Native folds aria-selected into accessibilityState on the host view, so the
// web-facing attribute is checked on the element the chip renders, which is
// what React Native Web turns into the DOM attribute.
describe('Chip', () => {
  it('exposes its selected state both ways, for native and for web', () => {
    render(<Chip label="Frontierland" selected />);
    expect(screen.getByRole('button', { name: 'Frontierland' }).props.accessibilityState.selected).toBe(true);
    expect(screen.UNSAFE_getAllByProps({ 'aria-selected': true }).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ 'aria-selected': false })).toHaveLength(0);
  });

  it('reads as not selected by default', () => {
    render(<Chip label="Tomorrowland" />);
    expect(screen.getByRole('button', { name: 'Tomorrowland' }).props.accessibilityState.selected).toBe(false);
    expect(screen.UNSAFE_getAllByProps({ 'aria-selected': false }).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ 'aria-selected': true })).toHaveLength(0);
  });
});
