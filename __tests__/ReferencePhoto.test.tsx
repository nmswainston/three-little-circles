import React from 'react';
import { Image } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ReferencePhoto from '../src/components/ReferencePhoto';

const source = { uri: 'https://example.test/pirates-exit-bells-mickey.jpg' };
const image = { file: 'pirates-exit-bells-mickey.jpg', alt: 'Three brass bells near the ceiling', credit: 'Nick S.' };

const photo = () => screen.UNSAFE_getAllByType(Image)[0];

describe('ReferencePhoto', () => {
  it('blurs the photo behind a reveal button while the answer is hidden', () => {
    render(<ReferencePhoto source={source} image={image} hidden />);
    expect(photo().props.blurRadius).toBeGreaterThan(0);
    expect(screen.getByText('Reveal photo')).toBeTruthy();
    expect(screen.getByText('Blurred while hints are on.')).toBeTruthy();
    expect(screen.getByLabelText('Reference photo, hidden. Tap to reveal.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('reveals on the first tap and enlarges on the second', () => {
    render(<ReferencePhoto source={source} image={image} hidden />);

    fireEvent.press(screen.getByLabelText('Reference photo, hidden. Tap to reveal.'));
    expect(photo().props.blurRadius).toBe(0);
    expect(screen.queryByText('Reveal photo')).toBeNull();
    expect(screen.getByText('Tap to enlarge.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();

    fireEvent.press(screen.getByLabelText(`${image.alt}. Tap to enlarge.`));
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByLabelText(image.alt)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('shows the photo clear from the start once the answer is open', () => {
    render(<ReferencePhoto source={source} image={image} hidden={false} />);
    expect(photo().props.blurRadius).toBe(0);
    expect(screen.queryByText('Reveal photo')).toBeNull();
    expect(screen.getByText('Tap to enlarge.')).toBeTruthy();
    expect(screen.getByLabelText(`${image.alt}. Tap to enlarge.`)).toBeTruthy();
  });

  it('credits the photographer under the photo and again when enlarged', () => {
    render(<ReferencePhoto source={source} image={image} hidden={false} />);
    expect(screen.getAllByText('Photo: Nick S.')).toHaveLength(1);
    fireEvent.press(screen.getByLabelText(`${image.alt}. Tap to enlarge.`));
    expect(screen.getAllByText('Photo: Nick S.')).toHaveLength(2);
  });

  it('shows no credit line when there is no credit', () => {
    const { credit: _credit, ...uncredited } = image;
    render(<ReferencePhoto source={source} image={uncredited} hidden={false} />);
    expect(screen.queryByText(/^Photo:/)).toBeNull();
  });
});
