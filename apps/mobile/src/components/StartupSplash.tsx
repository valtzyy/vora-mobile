import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface StartupSplashProps {
  /** Called once the fade-out finishes, so the caller can unmount this overlay. */
  onFinish: () => void;
  /** How long the logo stays fully visible before fading out. */
  holdMs?: number;
}

/**
 * Custom branded startup animation shown once the JS bundle takes over from
 * the native launch screen (see app.json's expo-splash-screen config for the
 * static logo shown before this mounts). Fades/scales the Vora wordmark in,
 * holds briefly, then fades the whole overlay out to reveal the app —
 * replaces the generic Expo loading experience with something on-brand.
 */
export default function StartupSplash({ onFinish, holdMs = 900 }: StartupSplashProps) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });

    const timer = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
    }, 450 + holdMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.Image
        source={require('../../assets/logo-wordmark.png')}
        resizeMode="contain"
        style={[styles.logo, logoStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logo: {
    width: 180,
    height: 90,
  },
});
