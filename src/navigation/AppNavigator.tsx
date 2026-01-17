import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import ParksScreen from '../screens/ParksScreen';
import ParkScreen from '../screens/ParkScreen';
import LandScreen from '../screens/LandScreen';
import AttractionScreen from '../screens/AttractionScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import MapScreen from '../screens/MapScreen';
import LocationDetailScreen from '../screens/LocationDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Parks" component={ParksScreen} />
      <Stack.Screen name="Park" component={ParkScreen} />
      <Stack.Screen name="Land" component={LandScreen} />
      <Stack.Screen name="Attraction" component={AttractionScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="LocationDetail" component={LocationDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
