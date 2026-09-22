import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, RootTabParamList } from './types';
import TabBar from '../components/layout/TabBar';
import ParksScreen from '../screens/ParksScreen';
import ParkScreen from '../screens/ParkScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import SubmitSightingScreen from '../screens/SubmitSightingScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ImportProgressScreen from '../screens/ImportProgressScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ParksStack = createNativeStackNavigator<RootStackParamList>();
const MapStack = createNativeStackNavigator<RootStackParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();

function ParksStackNavigator() {
  return (
    <ParksStack.Navigator initialRouteName="Parks" screenOptions={{ headerShown: false }}>
      <ParksStack.Screen name="Parks" component={ParksScreen} options={{ title: 'Parks' }} />
      <ParksStack.Screen name="Park" component={ParkScreen} options={{ title: 'Park' }} />
      <ParksStack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: 'Hidden find' }} />
      <ParksStack.Screen name="SubmitSighting" component={SubmitSightingScreen} options={{ title: 'Suggest a find' }} />
    </ParksStack.Navigator>
  );
}

function MapStackNavigator() {
  return (
    <MapStack.Navigator initialRouteName="Map" screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <MapStack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: 'Hidden find' }} />
    </MapStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator initialRouteName="Profile" screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="SubmitSighting" component={SubmitSightingScreen} options={{ title: 'Suggest a find' }} />
      <ProfileStack.Screen name="ImportProgress" component={ImportProgressScreen} options={{ title: 'Import progress' }} />
    </ProfileStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="ParksTab"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ParksTab" component={ParksStackNavigator} options={{ title: 'Parks' }} />
      <Tab.Screen name="MapTab" component={MapStackNavigator} options={{ title: 'Map' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
