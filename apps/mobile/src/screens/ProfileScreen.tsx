import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useAuth } from '../lib/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) return null; // AccountTab only mounts this when logged in

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-6 py-16 mt-10">
        <View className="w-16 h-16 rounded-full bg-vora-cream justify-center items-center mb-4">
          <Text className="text-2xl font-sansBold text-vora-green">
            {user.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-3xl font-serif text-vora-dark mb-1">{user.display_name}</Text>
        <Text className="text-[15px] font-sans text-gray-500 mb-10">@{user.username}</Text>

        <TouchableOpacity onPress={logout} className="px-6 py-3.5 rounded-lg border border-red-200 bg-red-50">
          <Text className="text-red-600 font-sansMedium text-center">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
