// Mock for react-native-maps - used when the .web.tsx file isn't being picked up
import React from 'react';
import { View, Text } from 'react-native';

export const Marker = ({ children, ...props }: any) => {
  return <View>{children}</View>;
};

const MapView = ({ children, ...props }: any) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text>Map view not available</Text>
      {children}
    </View>
  );
};

export default MapView;
