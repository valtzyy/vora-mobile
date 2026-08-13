import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GalleryStackParamList } from './types';
import GalleryScreen from '../screens/GalleryScreen';
import ScanResultScreen from '../screens/scan/ScanResultScreen';
import CertificateViewerScreen from '../screens/scan/CertificateViewerScreen';

const Stack = createNativeStackNavigator<GalleryStackParamList>();

export default function GalleryStack() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GalleryList" component={GalleryScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="CertificateViewer" component={CertificateViewerScreen} />
    </Stack.Navigator>
  );
}
