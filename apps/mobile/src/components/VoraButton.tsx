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

  if (variant === 'primary') {
    buttonClass += 'bg-[#191919] active:bg-slate-800 ';
    titleClass += 'text-white ';
    loaderColor = '#ffffff';
  } else if (variant === 'secondary') {
    buttonClass += 'bg-[#F4F3F3] active:bg-[#eaeaea] border border-slate-200/60 ';
    titleClass += 'text-[#191919] ';
    loaderColor = '#191919';
  } else if (variant === 'outline') {
    buttonClass += 'bg-transparent border border-slate-200 active:bg-slate-50 ';
    titleClass += 'text-slate-900 ';
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
