import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/i18n';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, language, setIsSettingsOpen } = useSettings();

  if (!user) return null; // AccountTab only mounts this when logged in

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-6 py-16 mt-10">
        <View className="w-16 h-16 rounded-full bg-emerald-50 justify-center items-center mb-4">
          <Text className="text-2xl font-sansBold text-emerald-700">
            {user.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-3xl font-serif text-vora-dark mb-1">{user.display_name}</Text>
        <Text className="text-[15px] font-sans text-gray-500 mb-10">@{user.username}</Text>

        <TouchableOpacity
          onPress={() => setIsSettingsOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 mb-4"
        >
          <Ionicons name="settings-outline" size={18} color="#57534e" />
          <Text className="flex-1 ml-3 text-slate-800 font-sansMedium">{t('nav.settings')}</Text>
          <Text className="text-xs font-sansBold text-slate-400 mr-2 uppercase">{language}</Text>
          <Ionicons name="chevron-forward" size={16} color="#a8a29e" />
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} className="px-6 py-3.5 rounded-xl border border-red-200 bg-red-50">
          <Text className="text-red-600 font-sansMedium text-center">{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
