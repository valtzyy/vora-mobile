import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/lib/queryClient';
import StartupSplash from './src/components/StartupSplash';
import { configureNotificationHandler, attachNotificationResponseListener } from './src/lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NavContainer: any = NavigationContainer;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>();

// Keep the native launch screen (see app.json's expo-splash-screen config —
// same Vora mark, not the generic Expo default) visible until fonts are
// ready, so there's no flash of blank screen before our JS splash takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    configureNotificationHandler();
    const unsubscribe = attachNotificationResponseListener(navigationRef);
    return unsubscribe;
  }, []);

  if (!fontsLoaded && !fontError) {
    // Native launch screen is still showing — render nothing so it isn't
    // covered by anything before our own splash is ready to take over.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <NavContainer ref={navigationRef}>
            <RootNavigator />
          </NavContainer>
        </QueryClientProvider>
        {showSplash && <StartupSplash onFinish={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
