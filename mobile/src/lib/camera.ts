import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Server limit is 700 KB decoded; base64 is 4/3 of that. Keep a margin for the JSON around it. */
const MAX_BASE64 = 900_000;
const MAX_SIDE = 1280;

export interface Photo { uri: string; base64: string }

export class CameraDenied extends Error {}

/**
 * Opens the camera (phone: the camera app; browser: the file picker, which offers the camera on phones) and returns a
 * JPEG small enough to upload as the delivery proof: longest side 1280 px, recompressed until it fits.
 * Returns null when the shipper closes the camera without taking a photo.
 */
export async function takeDeliveryPhoto(): Promise<Photo | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new CameraDenied('Ứng dụng cần quyền camera để chụp ảnh xác nhận giao hàng. Hãy bật trong Cài đặt.');
  }
  const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false, exif: false });
  if (shot.canceled || !shot.assets?.length) return null;
  const a = shot.assets[0];
  const landscape = (a.width || 0) >= (a.height || 0);
  const big = Math.max(a.width || 0, a.height || 0) > MAX_SIDE || !a.width;
  for (const compress of [0.6, 0.45, 0.3]) {
    const ctx = ImageManipulator.manipulate(a.uri);
    if (big) ctx.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
    const b64 = stripPrefix(out.base64 ?? '');
    if (b64 && b64.length <= MAX_BASE64) return { uri: out.uri, base64: b64 };
  }
  throw new Error('Ảnh quá lớn, vui lòng chụp lại');
}

/** Web returns base64 as a data URL on some browsers. */
function stripPrefix(b64: string): string {
  const i = b64.indexOf(',');
  return b64.startsWith('data:') && i > 0 ? b64.slice(i + 1) : b64;
}
