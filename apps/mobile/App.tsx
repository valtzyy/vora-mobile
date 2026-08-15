import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import RootNavigator from './src/navigation/RootNavigator';
import './global.css';

const NavContainer: any = NavigationContainer;

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <NavContainer>
          <RootNavigator />
        </NavContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
