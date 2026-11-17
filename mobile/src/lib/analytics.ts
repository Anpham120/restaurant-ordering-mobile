import { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled, setConsent, setUserId, setUserProperties, type Analytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

import { createTracker } from './analytics-events';
import { firebaseWebConfig } from './firebase-web-config';

/**
 * Web: Google Analytics for Firebase through the Firebase JS SDK (the Android app uses analytics.native.ts).
 * Calls made before the SDK is ready are queued; without a web config, or where the browser cannot run
 * Analytics (no cookies/IndexedDB), nothing is sent.
 */
let ga: Analytics | null = null;
let queue: ((a: Analytics) => void)[] | null = [];
const run = (f: (a: Analytics) => void) => { if (ga) f(ga); else queue?.push(f); };

if (firebaseWebConfig && typeof window !== 'undefined') {
  const config = firebaseWebConfig;
  isSupported().then((ok) => {
    if (!ok) { queue = null; return; }
    // no advertising: only analytics storage is granted
    setConsent({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    ga = getAnalytics(initializeApp(config));
    queue?.forEach((f) => f(ga!));
    queue = null;
  }).catch(() => { queue = null; });
} else {
  queue = null;
}

export const track = createTracker({
  enable: (on) => run((a) => setAnalyticsCollectionEnabled(a, on)),
  setUser: (id, props) => run((a) => { setUserId(a, id); setUserProperties(a, props); }),
  screen: (name) => run((a) => logEvent(a, 'screen_view', { firebase_screen: name, firebase_screen_class: name })),
  event: (name, params) => run((a) => logEvent(a, name, params)),
});
