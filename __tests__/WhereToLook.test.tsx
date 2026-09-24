import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WhereToLook from '../src/components/WhereToLook';

const steps = [
  { label: 'Scene', value: 'The mural behind the queue rail' },
  { label: 'Exact spot', value: 'Bottom left, worked into the rocks' },
  { label: 'Angle', value: 'Straight on from the second switchback' },
];
const colors = { accent: '#123456', onAccent: '#ffffff' };

describe('WhereToLook', () => {
  it('shows every step and no controls when fully revealed', () => {
    render(<WhereToLook steps={steps} revealed={steps.length} {...colors} />);
    for (const step of steps) expect(screen.getByText(step.value)).toBeTruthy();
    expect(screen.queryByText(/hints$/)).toBeNull();
    expect(screen.queryByText('First hint')).toBeNull();
    expect(screen.queryByText('Show everything')).toBeNull();
  });

  it('keeps every answer hidden at the bottom of the ladder but still names each hint', () => {
    const onRevealNext = jest.fn();
    const onRevealAll = jest.fn();
    render(<WhereToLook steps={steps} revealed={0} onRevealNext={onRevealNext} onRevealAll={onRevealAll} {...colors} />);

    expect(screen.getByText('0 of 3 hints')).toBeTruthy();
    for (const step of steps) {
      expect(screen.getByText(step.label)).toBeTruthy();
      expect(screen.queryByText(step.value)).toBeNull();
    }
    expect(screen.getAllByText('Hidden until you ask.')).toHaveLength(steps.length);

    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(onRevealNext).toHaveBeenCalledTimes(1);
    expect(onRevealAll).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Show everything' }));
    expect(onRevealAll).toHaveBeenCalledTimes(1);
  });

  it('opens steps in order and relabels the button after the first', () => {
    render(<WhereToLook steps={steps} revealed={1} {...colors} />);
    expect(screen.getByText(steps[0].value)).toBeTruthy();
    expect(screen.queryByText(steps[1].value)).toBeNull();
    expect(screen.queryByText(steps[2].value)).toBeNull();
    expect(screen.getByText('1 of 3 hints')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show the next hint' })).toBeTruthy();
    expect(screen.getByText('Next hint')).toBeTruthy();
  });

  it('treats a count past the end as fully revealed and a negative one as zero', () => {
    render(<WhereToLook steps={steps} revealed={99} {...colors} />);
    expect(screen.queryByText('Show everything')).toBeNull();
    expect(screen.getByText(steps[2].value)).toBeTruthy();

    screen.unmount();
    render(<WhereToLook steps={steps} revealed={-3} {...colors} />);
    expect(screen.getByText('0 of 3 hints')).toBeTruthy();
  });
});
