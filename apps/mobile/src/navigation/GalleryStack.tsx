import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GalleryStackParamList } from './types';
import GalleryScreen from '../screens/GalleryScreen';
import ScanResultScreen from '../screens/scan/ScanResultScreen';
import CertificateViewerScreen from '../screens/scan/CertificateViewerScreen';
import PlotDetailScreen from '../screens/plots/PlotDetailScreen';

const Stack = createNativeStackNavigator<GalleryStackParamList>();
const StackNavigator: any = Stack.Navigator;

export default function GalleryStack() {
  return (
    <StackNavigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GalleryList" component={GalleryScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="CertificateViewer" component={CertificateViewerScreen} />
      <Stack.Screen name="PlotDetail" component={PlotDetailScreen} />
    </StackNavigator>
  );
}
