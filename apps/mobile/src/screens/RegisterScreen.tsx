import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { VoraApiError } from '@vora/api-client';
import VoraButton from '../components/VoraButton';
import VoraInput from '../components/VoraInput';
import { useSettings } from '../lib/i18n';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register } = useAuth();
  const { t } = useSettings();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !displayName || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAll'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await register(username, password, displayName);

      Alert.alert(
        t('auth.success'),
        t('auth.accountCreated'),
        [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
      );
    } catch (error) {
      const message =
        error instanceof VoraApiError ? error.detail : (error as Error)?.message;
      Alert.alert(t('auth.registrationFailed'), message || t('auth.couldNotCreate'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-12 mt-4">
        <Text className="text-4xl font-serif text-vora-dark mb-2">{t('auth.createAccount')}</Text>
        <Text className="text-[15px] font-sans text-gray-500 mb-8">
          {t('auth.registerSubtitle')}
        </Text>

        <View className="space-y-2 mb-6">
          <VoraInput
            label={t('auth.displayName')}
            placeholder={t('auth.displayNamePlaceholder')}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <VoraInput
            label={t('auth.username')}
            placeholder={t('auth.usernamePick')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <VoraInput
            label={t('auth.password')}
            placeholder={t('auth.passwordCreate')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <VoraInput
            label={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPlaceholder')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <VoraButton
          title={t('auth.signUp')}
          onPress={handleRegister}
          isLoading={isLoading}
          variant="primary"
          className="mt-2"
        />

        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-gray-500 font-sans">{t('auth.haveAccount')}</Text>
          <Text 
            className="text-vora-green font-sansMedium"
            onPress={() => navigation.navigate('Login' as never)}
          >
            {t('common.signIn')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
