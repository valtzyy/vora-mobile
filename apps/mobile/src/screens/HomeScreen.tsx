import React from 'react';
import { View, Text, Image, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import VoraButton from '../components/VoraButton';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Hero Section */}
      <View className="bg-slate-50 border-b border-slate-200/50 px-6 pt-16 pb-12 rounded-b-[2rem]">
        <Image
          source={require('../../assets/logo-wordmark.png')}
          resizeMode="contain"
          style={{ height: 60, width: 120, marginBottom: 8 }}
        />
        <Text className="text-[15px] font-sans text-slate-700 leading-6">
          Measure tree carbon from smartphone video. 
        </Text>
      </View>

      {/* Content Section */}
      <View className="px-6 pt-10 pb-16">
        <Text className="text-2xl font-serif text-slate-900 mb-6">How it works</Text>
        
        {/* Steps */}
        <View className="mb-10 space-y-5">
          {/* Step 1 */}
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100/55 justify-center items-center mr-4">
              <Text className="text-lg font-sansBold text-emerald-700">1</Text>
            </View>
            <View className="flex-1 mt-1">
              <Text className="text-base font-sansMedium text-slate-900 mb-1">Record Video</Text>
              <Text className="text-sm font-sans text-gray-500 leading-5">
                Film a short video around the tree trunk using your smartphone
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100/55 justify-center items-center mr-4">
              <Text className="text-lg font-sansBold text-emerald-700">2</Text>
            </View>
            <View className="flex-1 mt-1">
              <Text className="text-base font-sansMedium text-slate-900 mb-1">Process</Text>
              <Text className="text-sm font-sans text-gray-500 leading-5">
                Our AI reconstructs the tree in 3D and calculates carbon content
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100/55 justify-center items-center mr-4">
              <Text className="text-lg font-sansBold text-emerald-700">3</Text>
            </View>
            <View className="flex-1 mt-1">
              <Text className="text-base font-sansMedium text-slate-900 mb-1">View Results</Text>
              <Text className="text-sm font-sans text-gray-500 leading-5">
                See DBH, height, biomass, and CO2e estimation instantly
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <VoraButton
          title="Start New Scan"
          variant="primary"
          onPress={() => navigation.navigate('Scan')}
          className="mb-4"
        />

        <VoraButton
          title="View Past Scans"
          variant="secondary"
          onPress={() => navigation.navigate('Gallery')}
          className="mb-10"
        />

        {/* User Session Management */}
        <View className="border-t border-gray-200 pt-8 mt-4 items-center">
          {user ? (
            <>
              <Text className="text-sm font-sans text-gray-400 mb-4">
                Signed in as {user.display_name}
              </Text>
              <TouchableOpacity onPress={logout} className="px-6 py-3 rounded-xl border border-red-200 bg-red-50 active:scale-[0.97]">
                <Text className="text-red-600 font-sansMedium">Log Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm font-sans text-gray-400 mb-4">
                Browsing without an account — sign in to save scans to plots
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Account')}
                className="px-6 py-3 rounded-xl border border-slate-200 bg-slate-50 active:scale-[0.97]"
              >
                <Text className="text-slate-700 font-sansMedium">Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
