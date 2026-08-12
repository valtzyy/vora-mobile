import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface VoraInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function VoraInput({ label, error, className = '', ...props }: VoraInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="text-vora-dark font-sansMedium mb-2 text-sm">
        {label}
      </Text>
      <View 
        className={`bg-white border rounded-xl px-4 py-3.5 flex-row items-center transition-colors
          ${isFocused ? 'border-vora-dark' : error ? 'border-red-500' : 'border-gray-300'}
        `}
        style={{
          shadowColor: isFocused ? '#000' : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isFocused ? 0.05 : 0,
          shadowRadius: 4,
          elevation: isFocused ? 2 : 0,
        }}
      >
        <TextInput
          className="flex-1 text-vora-dark font-sans text-[15px]"
          placeholderTextColor="#94a3b8"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1.5 font-sans">{error}</Text>
      )}
    </View>
  );
}
