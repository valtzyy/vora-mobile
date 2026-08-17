import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, type Language } from '../lib/i18n';

/**
 * Mirrors the web app's settings modal, trimmed to the display-language row.
 * Rendered once at the app root (App.tsx) and opened from the Account tab.
 */
export default function SettingsModal() {
  const { language, setLanguage, isSettingsOpen, setIsSettingsOpen, t } = useSettings();

  const close = () => setIsSettingsOpen(false);

  return (
    <Modal visible={isSettingsOpen} animationType="slide" transparent onRequestClose={close}>
      <View className="flex-1 bg-black/40 justify-end">
        {/* Tapping the scrim closes, matching the web modal's backdrop click */}
        <Pressable className="flex-1" onPress={close} />

        <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-start px-6 pt-6 pb-5 border-b border-slate-200 bg-slate-50">
            <View className="w-11 h-11 rounded-2xl bg-white border border-slate-200 justify-center items-center mr-4">
              <Ionicons name="settings-outline" size={20} color="#57534e" />
            </View>
            <View className="flex-1 pt-0.5">
              <Text className="text-base font-sansBold text-slate-800 uppercase tracking-wider font-bold mb-1">
                {t('settings.title')}
              </Text>
              <Text className="text-xs font-sans text-slate-500 leading-relaxed">
                {t('settings.subtitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={10} className="pl-3 pt-1">
              <Ionicons name="close" size={22} color="#57534e" />
            </TouchableOpacity>
          </View>

          {/* Language row */}
          <View className="flex-row items-center justify-between px-6 py-6">
            <View className="flex-1 pr-4">
              <Text className="text-base font-sansBold text-slate-800 font-bold mb-1">
                {t('settings.language')}
              </Text>
              <Text className="text-xs font-sans text-slate-500 leading-relaxed">
                {t('settings.languageDesc')}
              </Text>
            </View>
            <View className="flex-row bg-slate-100 border border-slate-200 rounded-2xl p-1">
              <LanguageOption code="id" label="ID" active={language === 'id'} onPress={setLanguage} />
              <LanguageOption code="en" label="EN" active={language === 'en'} onPress={setLanguage} />
            </View>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <View className="flex-row items-center gap-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <Text className="text-xs font-sans text-slate-500">{t('settings.saved')}</Text>
            </View>
            <TouchableOpacity
              onPress={close}
              className="bg-[#292524] active:bg-[#1c1917] px-7 py-3 rounded-xl"
              activeOpacity={0.85}
            >
              <Text className="text-white text-sm font-sansBold font-bold">{t('settings.close')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function LanguageOption({
  code,
  label,
  active,
  onPress,
}: {
  code: Language;
  label: string;
  active: boolean;
  onPress: (lang: Language) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(code)}
      activeOpacity={0.8}
      className={`px-5 py-2 rounded-xl ${active ? 'bg-emerald-600' : ''}`}
    >
      <Text
        className={`text-sm font-sansBold font-bold ${active ? 'text-white' : 'text-slate-500'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
