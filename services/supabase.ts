import * as FileSystem from 'expo-file-system/legacy';

function getMimeType(uri: string): string {
  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith('.png')) return 'image/png';
  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerUri.endsWith('.gif')) return 'image/gif';
  if (lowerUri.endsWith('.mp4')) return 'video/mp4';
  if (lowerUri.endsWith('.mov')) return 'video/quicktime';
  if (lowerUri.endsWith('.m4a') || lowerUri.endsWith('.mp3') || lowerUri.endsWith('.wav')) return 'audio/mpeg';
  return 'application/octet-stream';
}

export async function uploadToSupabase(
  uri: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const mimeType = getMimeType(uri);
    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.error('Failed to read media file:', err);
    return null;
  }
}
