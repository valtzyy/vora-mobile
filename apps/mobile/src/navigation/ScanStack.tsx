import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ScanStackParamList } from './types';
import ScanCaptureScreen from '../screens/scan/ScanCaptureScreen';
import ScanMarkingScreen from '../screens/scan/ScanMarkingScreen';
import ScanProcessingScreen from '../screens/scan/ScanProcessingScreen';
import ScanResultScreen from '../screens/scan/ScanResultScreen';
import CertificateViewerScreen from '../screens/scan/CertificateViewerScreen';

const Stack = createNativeStackNavigator<ScanStackParamList>();
const StackNavigator: any = Stack.Navigator;

export default function ScanStack() {
  return (
    <StackNavigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanCapture" component={ScanCaptureScreen} />
      <Stack.Screen name="ScanMarking" component={ScanMarkingScreen} />
      <Stack.Screen name="ScanProcessing" component={ScanProcessingScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="CertificateViewer" component={CertificateViewerScreen} />
    </StackNavigator>
  );
}
