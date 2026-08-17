import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, AuthProvider } from '../lib/AuthContext';
import { useSettings } from '../lib/i18n';

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
  const { t } = useSettings();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <ActivityIndicator size="large" color="#616c39" />
        {isWakingUp && (
          <Text className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mt-4 text-center leading-relaxed">
            {t('common.wakingUp')}
          </Text>
        )}
      </View>
    );
  }

  return user ? <ProfileScreen /> : <AuthStack />;
}

function AppTabs() {
  const { t } = useSettings();

  return (
    <TabNavigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#616c39',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tab.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryStack}
        options={{
          tabBarLabel: t('tab.gallery'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        options={{
          tabBarLabel: t('tab.scan'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: t('tab.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountTab}
        options={{
          tabBarLabel: t('tab.account'),
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
  const { t } = useSettings();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <ActivityIndicator size="large" color="#616c39" />
        {isWakingUp && (
          <Text className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mt-4 text-center leading-relaxed">
            {t('common.wakingUp')}
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
