/**
 * The promotion popup is shown once each time the app is opened and once after every sign-in. The session counts
 * these visits (welcomeSeq, 1 when the app starts); this remembers the last one whose popup was closed, so the home
 * screen mounting again does not bring it back. Screens keep their own copy in state (initialised from here) so
 * closing re-renders them.
 */
let dismissed = 0;
export const lastDismissedWelcome = (): number => dismissed;
export function dismissWelcome(seq: number): void { dismissed = Math.max(dismissed, seq); }
