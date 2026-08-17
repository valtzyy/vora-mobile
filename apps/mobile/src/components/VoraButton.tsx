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
  let buttonClass = 'py-[14px] px-6 rounded-xl flex-row justify-center items-center active:scale-[0.97] transition-transform ';
  let titleClass = 'font-sansMedium text-[15px] ';
  let loaderColor = '#ffffff';

  // Charcoal-on-white, matching the web app's primary submit button
  // (bg-[#292524] hover:bg-[#1c1917]) in login/register.
  if (variant === 'primary') {
    buttonClass += 'bg-[#292524] active:bg-[#1c1917] ';
    titleClass += 'text-white ';
    loaderColor = '#ffffff';
  } else if (variant === 'secondary') {
    buttonClass += 'bg-[#f5f5f4] active:bg-[#e7e5e4] border border-slate-200/60 ';
    titleClass += 'text-[#292524] ';
    loaderColor = '#292524';
  } else if (variant === 'outline') {
    buttonClass += 'bg-transparent border border-slate-200 active:bg-slate-50 ';
    titleClass += 'text-slate-900 ';
    loaderColor = '#292524';
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
