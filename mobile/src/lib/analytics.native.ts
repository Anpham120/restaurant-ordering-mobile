import Constants, { ExecutionEnvironment } from 'expo-constants';

import { createTracker, type AnalyticsBackend } from './analytics-events';

type Rnfb = typeof import('@react-native-firebase/analytics');

/**
 * Android/iOS: Google Analytics for Firebase through React Native Firebase. The default Firebase app comes from
 * google-services.json (expo.android.googleServicesFile), so there is no initializeApp here. No advertising:
 * ad storage, ad user data and ad personalization are denied (see also firebase.json).
 * Expo Go has no Firebase native module, so there (and if loading fails) analytics is a no-op.
 */
function load(): AnalyticsBackend | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require('@react-native-firebase/analytics') as Rnfb;
    const a = fb.getAnalytics();
    /** Native calls answer with a promise (or nothing); a rejected one must not surface as an unhandled rejection. */
    const quiet = (r: unknown) => { if (r instanceof Promise) r.catch(() => undefined); };
    quiet(fb.setConsent(a, { analytics_storage: true, ad_storage: false, ad_user_data: false, ad_personalization: false }));
    return {
      enable: (on) => quiet(fb.setAnalyticsCollectionEnabled(a, on)),
      setUser: (id, props) => { quiet(fb.setUserId(a, id)); quiet(fb.setUserProperties(a, props)); },
      screen: (name) => quiet(fb.logScreenView(a, { screen_name: name, screen_class: name })),
      event: (name, params) => quiet(fb.logEvent(a, name, params)),
    };
  } catch {
    return null;
  }
}

const noop: AnalyticsBackend = { enable: () => undefined, setUser: () => undefined, screen: () => undefined, event: () => undefined };

export const track = createTracker(load() ?? noop);
