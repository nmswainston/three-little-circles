// Jest runs in Node, where the native AsyncStorage module does not exist.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
