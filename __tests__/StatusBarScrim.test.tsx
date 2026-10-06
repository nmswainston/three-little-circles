import React from 'react';
import { ScrollView, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import StatusBarScrim, { useScrolledPast } from '../src/components/layout/StatusBarScrim';

// A phone with a status bar, so the strip has a height to draw.
let mockTop = 24;
jest.mock('react-native-safe-area-context', () => {
  const mock = jest.requireActual('react-native-safe-area-context/jest/mock').default;
  return { ...mock, useSafeAreaInsets: () => ({ top: mockTop, bottom: 0, left: 0, right: 0 }) };
});

function Screen() {
  const { scrolled, onScroll } = useScrolledPast();
  return (
    <>
      <StatusBarScrim visible={scrolled} />
      <ScrollView testID="list" onScroll={onScroll} scrollEventThrottle={16}>
        <Text>Content</Text>
      </ScrollView>
    </>
  );
}

const scrollTo = (y: number) =>
  fireEvent.scroll(screen.getByTestId('list'), { nativeEvent: { contentOffset: { y } } });

// The strip is hidden from screen readers, so it is found by its style.
const strip = () =>
  screen.UNSAFE_queryAllByProps({ pointerEvents: 'none' }).find((n) => n.props.style && JSON.stringify(n.props.style).includes('"zIndex":10'));

describe('StatusBarScrim', () => {
  beforeEach(() => {
    mockTop = 24;
  });

  it('stays out of the way at the top of the page', () => {
    render(<Screen />);
    expect(strip()).toBeUndefined();
    scrollTo(4);
    expect(strip()).toBeUndefined();
  });

  it('covers the status bar once the page has scrolled, and lets go at the top again', () => {
    render(<Screen />);
    scrollTo(120);
    expect(strip()).toBeDefined();
    expect(JSON.stringify(strip()!.props.style)).toContain('"height":24');
    scrollTo(0);
    expect(strip()).toBeUndefined();
  });

  it('draws nothing on a screen with no status bar inset', () => {
    mockTop = 0;
    render(<Screen />);
    scrollTo(120);
    expect(strip()).toBeUndefined();
  });
});
