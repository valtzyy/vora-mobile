import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from './types';
import DashboardScreen from '../screens/DashboardScreen';
import PlotDetailScreen from '../screens/plots/PlotDetailScreen';
import CreatePlotScreen from '../screens/plots/CreatePlotScreen';
import ScanResultScreen from '../screens/scan/ScanResultScreen';
import CertificateViewerScreen from '../screens/scan/CertificateViewerScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStack() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="PlotDetail" component={PlotDetailScreen} />
      <Stack.Screen name="CreatePlot" component={CreatePlotScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="CertificateViewer" component={CertificateViewerScreen} />
    </Stack.Navigator>
  );
}
