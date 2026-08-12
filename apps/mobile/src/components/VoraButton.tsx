import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';

interface VoraButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  textClassName?: string;
}

export default function VoraButton({ 
  title, 
  onPress, 
  isLoading = false, 
  disabled = false, 
  variant = 'primary',
  className = '',
  textClassName = ''
}: VoraButtonProps) {
  
  // Base classes with active bounce effect matching web
  let buttonClass = 'py-[14px] px-6 rounded-lg flex-row justify-center items-center active:scale-[0.97] transition-transform ';
  let titleClass = 'font-sansMedium text-[15px] ';
  let loaderColor = '#ffffff';

  if (variant === 'primary') {
    buttonClass += 'bg-vora-green ';
    titleClass += 'text-white ';
  } else if (variant === 'secondary') {
    buttonClass += 'bg-vora-black ';
    titleClass += 'text-white ';
  } else if (variant === 'outline') {
    buttonClass += 'bg-transparent border border-gray-200 active:bg-gray-50 ';
    titleClass += 'text-vora-dark ';
    loaderColor = '#191919';
  }

  if (disabled || isLoading) {
    buttonClass += 'opacity-70 ';
  }

  return (
    <Pressable 
      onPress={onPress} 
      disabled={disabled || isLoading}
      className={`${buttonClass} ${className}`}
    >
      {isLoading ? (
        <ActivityIndicator color={loaderColor} size="small" />
      ) : (
        <Text className={`${titleClass} ${textClassName}`}>{title}</Text>
      )}
    </Pressable>
  );
}
