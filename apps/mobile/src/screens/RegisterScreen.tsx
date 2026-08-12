import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { VoraApiError } from '@vora/api-client';
import VoraButton from '../components/VoraButton';
import VoraInput from '../components/VoraInput';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !displayName || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(username, password, displayName);

      Alert.alert(
        'Success',
        'Your account has been created successfully. Please sign in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
      );
    } catch (error) {
      const message =
        error instanceof VoraApiError ? error.detail : (error as Error)?.message;
      Alert.alert('Registration Failed', message || 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-12 mt-4">
        <Text className="text-4xl font-serif text-vora-dark mb-2">Create Account</Text>
        <Text className="text-[15px] font-sans text-gray-500 mb-8">
          Join Vora to start measuring tree carbon
        </Text>

        <View className="space-y-2 mb-6">
          <VoraInput
            label="Display Name"
            placeholder="E.g. John Doe"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <VoraInput
            label="Username"
            placeholder="Choose a unique username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <VoraInput
            label="Password"
            placeholder="Create a strong password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <VoraInput
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <VoraButton
          title="Sign Up"
          onPress={handleRegister}
          isLoading={isLoading}
          variant="primary"
          className="mt-2"
        />

        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-gray-500 font-sans">Already have an account? </Text>
          <Text 
            className="text-vora-green font-sansMedium"
            onPress={() => navigation.navigate('Login' as never)}
          >
            Sign In
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
