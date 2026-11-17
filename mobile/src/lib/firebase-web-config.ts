import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase console → Project settings → Your apps → "Atlas Web" → SDK setup and configuration → Config.
 * These values are public by design (they ship inside the web bundle); they are not secrets.
 * null: the web build does not send analytics (the Android app still does, from google-services.json).
 */
export const firebaseWebConfig: FirebaseOptions | null = null;
