import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Downloads a file from the backend API (passing auth header if logged in)
 * and opens the native system share/download sheet.
 */
export async function downloadAndShare(
  url: string,
  filename: string,
  mimeType: string,
  token: string | null = null
): Promise<void> {
  try {
    const localUri = `${FileSystem.cacheDirectory}${filename}`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const downloadResult = await FileSystem.downloadAsync(url, localUri, {
      headers,
    });
    
    if (downloadResult.status !== 200) {
      throw new Error(`Server returned HTTP ${downloadResult.status}`);
    }
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Sharing is not available on this device");
    }
    
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType,
      dialogTitle: `Share ${filename}`,
      UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data',
    });
  } catch (err) {
    console.error('[FILE SHARE ERROR]:', err);
    Alert.alert(
      'Sharing Failed',
      (err as Error)?.message || 'An error occurred while downloading the file.'
    );
  }
}
