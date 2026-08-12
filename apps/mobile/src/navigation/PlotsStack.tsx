import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PlotsStackParamList } from './types';
import PlotsListScreen from '../screens/plots/PlotsListScreen';
import PlotDetailScreen from '../screens/plots/PlotDetailScreen';
import CreatePlotScreen from '../screens/plots/CreatePlotScreen';

const Stack = createNativeStackNavigator<PlotsStackParamList>();

export default function PlotsStack() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlotsList" component={PlotsListScreen} />
      <Stack.Screen name="PlotDetail" component={PlotDetailScreen} />
      <Stack.Screen name="CreatePlot" component={CreatePlotScreen} />
    </Stack.Navigator>
  );
}
