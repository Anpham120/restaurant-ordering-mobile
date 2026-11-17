# Promotion Popup Session Implementation Plan

> **For agentic workers:** Implement inline with the test-first workflow; request one independent review before publishing the branch.

**Goal:** Limit muted promotion IDs to the current login session.

**Architecture:** `SessionProvider` owns the in-memory IDs. `useHiddenPromos` reads
that context, retaining the existing home-screen interface.

**Tech Stack:** Expo 58, React 19.3, TypeScript, Jest Expo, React Native Testing Library.

**Spec:** [Session behavior](../specs/2026-11-17-promo-popup-session-design.md).

## Global Constraints

- Preserve the home carousel and the existing once-per-welcome X behavior.
- Never persist muted IDs; discard the old device preference.
- Open a feature-branch PR targeting `develop`; leave merging to the team leader.

## Review Focus

- New accounts and repeated logins must not inherit muted IDs.
- Failed authentication and profile/token refresh must preserve current-session choices.
- Logout and unauthorized responses must clear session choices.
- Legacy storage or a rejected cleanup must not suppress the popup.
- Home remounts must retain the choices until a session boundary.

## Task 1: Session-scoped muting and regression coverage

**Files:** `mobile/src/lib/session.tsx`, `mobile/src/lib/hidden-promos.ts`,
`mobile/src/components/promo-popup.tsx`, `mobile/src/app/(customer)/index.tsx`,
`mobile/src/lib/__tests__/promo-session.test.tsx`, `mobile/package.json`,
`mobile/src/components/__tests__/promo-popup.test.tsx`,
`mobile/package-lock.json`, `.github/workflows/ci-cd.yml`, `mobile/README.md`.

- [x] Add Jest Expo configuration and regression tests against the existing hook and provider.
- [x] Run `npm test -- --runInBand`; confirm the reported login/registration failures.
- [x] Move hidden IDs into session context; reset after successful login/registration and sign-out.
- [x] Replace the persistent hook with the context adapter and remove the legacy key on startup.
- [x] Update popup label, accessibility label, toast, and comments to describe session scope.
- [x] Run tests, lint, typecheck, and web export; add the test command to existing mobile CI.
- [x] Document behavior and checks; review the complete diff and resolve blocking findings.
- [ ] Commit, push the feature branch, and open a PR into `develop`.

## Verification record

- Before the fix: 10 failures, including repeated login and registration after muting.
- After the fix: 16 tests pass in two suites; lint, typecheck, and web export pass.
- Inverting the sign-out reset condition breaks three regression tests; source restored.
- Independent review: no blocking findings. Physical Android/iOS checks remain manual.
- The current GitHub account has read access to the upstream repository, so publish
  the branch from its fork and target the upstream `develop` branch.
