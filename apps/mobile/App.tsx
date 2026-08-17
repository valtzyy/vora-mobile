import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Geist_400Regular, Geist_500Medium, Geist_700Bold } from '@expo-google-fonts/geist';
import { Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import * as SplashScreen from 'expo-splash-screen';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/lib/queryClient';
import StartupSplash from './src/components/StartupSplash';
import { SettingsProvider } from './src/lib/i18n';
import SettingsModal from './src/components/SettingsModal';
import { configureNotificationHandler, attachNotificationResponseListener, requestNotificationPermissions } from './src/lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NavContainer: any = NavigationContainer;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>();

// Keep the native launch screen (see app.json's expo-splash-screen config —
// same Vora mark, not the generic Expo default) visible until fonts are
// ready, so there's no flash of blank screen before our JS splash takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // Same pairing as the web app: Geist for UI/body, Lora for display serif.
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
    Lora_400Regular,
    Lora_600SemiBold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [, requestCameraPermission] = useCameraPermissions();
  const [, requestMicrophonePermission] = useMicrophonePermissions();

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

  // Ask for camera, mic, and notification permissions once up front on app
  // launch, so the OS prompts are out of the way before the user ever hits
  // the record button or a scan finishes — screens that use these no longer
  // need to request them just-in-time (they still guard on the granted
  // state in case the user denies here or revokes it later in Settings).
  useEffect(() => {
    requestCameraPermission();
    requestMicrophonePermission();
    requestNotificationPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fontsLoaded && !fontError) {
    // Native launch screen is still showing — render nothing so it isn't
    // covered by anything before our own splash is ready to take over.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <NavContainer ref={navigationRef}>
              <RootNavigator />
            </NavContainer>
            <SettingsModal />
          </QueryClientProvider>
        </SettingsProvider>
        {showSplash && <StartupSplash onFinish={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
