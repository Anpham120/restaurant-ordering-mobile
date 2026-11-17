/* global jest */
// React Native Firebase needs its native module, which Jest does not have: analytics calls become no-ops.
jest.mock('@react-native-firebase/analytics', () => {
  const noop = () => Promise.resolve();
  return {
    getAnalytics: () => ({}),
    logEvent: noop, logScreenView: noop, setAnalyticsCollectionEnabled: noop, setConsent: noop, setUserId: noop, setUserProperties: noop,
  };
});
