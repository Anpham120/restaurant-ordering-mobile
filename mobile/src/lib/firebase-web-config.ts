import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase console → Project settings → Your apps → "Atlas Web" → SDK setup and configuration → Config.
 * These values are public by design (they ship inside the web bundle); they are not secrets.
 * null: the web build does not send analytics (the Android app still does, from google-services.json).
 */
export const firebaseWebConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyA_IThRTJQrFQ_j0hn-beuFQuJCI6viZwk',
  authDomain: 'atlas---restaurant.firebaseapp.com',
  projectId: 'atlas---restaurant',
  storageBucket: 'atlas---restaurant.firebasestorage.app',
  messagingSenderId: '599973154783',
  appId: '1:599973154783:web:0d171583e501be986cbe6a',
  measurementId: 'G-9NYB0KXRD3',
};
