import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';

// Local notifications only — this app is still tested primarily via Expo Go,
// and Expo Go (SDK 53+) removed support for remote/push notifications
// entirely. Local notifications (scheduled with trigger: null to fire
// immediately) are unaffected and work fine in Expo Go — verified against
// the installed expo-notifications source: the Expo-Go warning only fires
// from the push-token registration path, never from scheduleNotificationAsync.
//
// Known limitation: this relies on the app's own JS polling loop
// (ScanProcessingScreen) detecting completion. If the app is backgrounded,
// the notification fires late (once the user reopens the app and polling
// resumes). If the app is force-quit during processing, no notification
// will fire at all — there's no background task or server-push wired up.
// A real fix needs either a dev-client build with a background task, or a
// server-triggered push; both are explicitly out of scope for now.

let handlerConfigured = false;

/** Call once (e.g. on app mount) to control how notifications present while the app is in the foreground. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Requested just-in-time (same pattern as camera/mic permissions elsewhere in this app), not at cold start. */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (err) {
    console.log('[notifications] Failed to request notification permissions:', err);
    return false;
  }
}

/** Fires a local "scan complete" notification. Fails soft — a denied/unavailable permission never throws. */
export async function notifyScanComplete(treeCode: string): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Scan complete',
        body: `Tree ${treeCode} is ready to view.`,
        data: { treeCode, screen: 'ScanResult' },
      },
      trigger: null,
    });
  } catch (err) {
    console.log('[notifications] Failed to schedule scan-complete notification:', err);
  }
}

/** Wires up "tap notification -> navigate to that scan's result". Call once; returns an unsubscribe function. */
export function attachNotificationResponseListener(
  navigationRef: NavigationContainerRef<any>
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { treeCode?: string; screen?: string }
      | undefined;
    if (data?.treeCode && navigationRef.isReady()) {
      // The root tab navigator (RootNavigator.tsx) has no typed param list
      // (createBottomTabNavigator() with no generic), so there's no single
      // RootParamList to type this cross-cutting navigate call against —
      // `any` here is deliberate, not a shortcut around a type we could
      // otherwise get right.
      (navigationRef as any).navigate('Scan', {
        screen: 'ScanResult',
        params: { treeCode: data.treeCode },
      });
    }
  });
  return () => subscription.remove();
}
