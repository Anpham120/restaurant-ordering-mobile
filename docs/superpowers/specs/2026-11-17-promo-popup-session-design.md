# Promotion popup session scope

The customer requested session-scoped promotion muting because a device-wide
AsyncStorage key currently hides campaigns for subsequent logins and new accounts.

## Approaches

- Keep device persistence: retains the reported cross-account bug.
- Persist per account: isolates accounts but still hides campaigns after a new login.
- Keep IDs in `SessionProvider` memory: selected to match the requested login-session scope.

## Behavior

- X closes the current welcome popup; it may appear after the next successful login.
- “Không hiển thị lại trong phiên này” hides only that campaign for the current session.
- Muting survives home-screen remounts and profile refreshes within that session.
- Successful login/registration, logout, expiration, and a fresh app run start with no muted IDs.
- A failed login/registration does not clear the current session's muted IDs.
- Ignore and remove the old `atlas.promo.hidden.v1` key. Storage cleanup failure must not block the app.
- The home carousel remains available. No backend changes or settings toggle are needed.

Use the existing Expo SDK 58 stack. Add regression tests using Expo's recommended
Jest preset and React Native Testing Library; do not change runtime dependencies.

## 2026-11-19 refinement

The customer chose to keep running voucher banners visible for information after
their personal voucher limit is reached. This requires a backend display-rule
change; checkout must continue rejecting voucher reuse. Opening the advertised
category, dish, or voucher must retain every home banner and its pagination.
Late responses from an earlier account/focus must not overwrite newer screen data.
