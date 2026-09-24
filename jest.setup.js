// Jest runs in Node, where the native AsyncStorage module does not exist.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Screens read safe-area insets from a native provider. The package ships a
// mock that answers with zero insets and a phone-sized frame.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

// Icon fonts load asynchronously, so every icon flips its state after the
// test that rendered it has finished. Render the icon's name as text instead;
// a test can then also assert which icon is showing.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }) => React.createElement(Text, rest, name);
  Icon.glyphMap = {};
  const sets = { __esModule: true };
  return new Proxy(sets, { get: (target, prop) => (prop in target ? target[prop] : Icon) });
});

// react-native-maps has no Jest mock of its own and needs a native map view.
// Stand in with plain views that answer the imperative calls the Map screen
// makes and report the map as ready at once.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef(({ children, onMapReady }, ref) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn(), fitToCoordinates: jest.fn() }));
    const announced = React.useRef(false);
    React.useEffect(() => {
      if (announced.current) return;
      announced.current = true;
      onMapReady?.();
    });
    return React.createElement(View, { testID: 'map-view' }, children);
  });
  const Marker = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ showCallout: jest.fn() }));
    return React.createElement(View, { testID: 'map-marker', accessibilityLabel: props.title });
  });
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: 'google' };
});
