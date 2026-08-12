import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { VoraApiError } from '@vora/api-client';
import VoraButton from '../components/VoraButton';
import VoraInput from '../components/VoraInput';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      const message =
        error instanceof VoraApiError ? error.detail : (error as Error)?.message;
      Alert.alert('Login Failed', message || 'Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-16 mt-10">
        <Text className="text-4xl font-serif text-vora-dark mb-2">Welcome Back</Text>
        <Text className="text-[15px] font-sans text-gray-500 mb-10">
          Sign in to Vora to continue your tree scans
        </Text>

        <View className="space-y-2 mb-6">
          <VoraInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <VoraInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <VoraButton
          title="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          variant="primary"
          className="mt-4"
        />

        <View className="mt-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <Text className="text-xs font-sans text-gray-500">
            Demo account: <Text className="font-sansMedium text-gray-700">juri_demo</Text> / <Text className="font-sansMedium text-gray-700">demo123</Text>
          </Text>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500 font-sans">Don't have an account? </Text>
          <Text
            className="text-vora-green font-sansMedium"
            onPress={() => navigation.navigate('Register' as never)}
          >
            Sign Up
          </Text>
        </View>

        {navigation.canGoBack() && (
          <View className="flex-row justify-center mt-4">
            <Text
              className="text-gray-400 font-sans"
              onPress={() => navigation.goBack()}
            >
              Continue without an account
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
