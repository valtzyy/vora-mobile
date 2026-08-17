import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, AuthProvider } from '../lib/AuthContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GalleryStack from './GalleryStack';
import ScanStack from './ScanStack';
import DashboardStack from './DashboardStack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const StackNavigator: any = Stack.Navigator;
const TabNavigator: any = Tab.Navigator;

function AuthStack() {
  return (
    <StackNavigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </StackNavigator>
  );
}

function AccountTab() {
  const { user, isLoading, isWakingUp } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <ActivityIndicator size="large" color="#10B981" />
        {isWakingUp && (
          <Text className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mt-4 text-center leading-relaxed">
            Waking up the server (it sleeps when idle). This can take up to a minute on the first try.
          </Text>
        )}
      </View>
    );
  }

  return user ? <ProfileScreen /> : <AuthStack />;
}

function AppTabs() {
  return (
    <TabNavigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryStack}
        options={{
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        options={{
          tabBarLabel: 'New Scan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountTab}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </TabNavigator>
  );
}

function NavigationContent() {
  const { isLoading, isWakingUp } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <ActivityIndicator size="large" color="#10B981" />
        {isWakingUp && (
          <Text className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mt-4 text-center leading-relaxed">
            Waking up the server (it sleeps when idle). This can take up to a minute on the first try.
          </Text>
        )}
      </View>
    );
  }

  return <AppTabs />;
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContent />
    </AuthProvider>
  );
}
