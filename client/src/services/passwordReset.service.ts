import * as Linking from 'expo-linking';

import { supabase } from '../lib/supabase';

/**
 * Sends a password-reset email via Supabase Auth, straight through the client-side anon-key
 * `supabase` instance (see lib/supabase.ts) — NOT through the Express backend. The PKCE
 * code_verifier this call generates is stored in THIS device/browser's local storage, and
 * the later confirmPasswordReset() exchange (once the user taps the link in their email) can
 * only find it there; the backend has no equivalent per-device storage to hold it in.
 * Mirrors googleAuth.service.ts's use of the same client for the same PKCE reason.
 *
 * Resolves the same way whether or not the email actually belongs to an account — Supabase
 * itself behaves identically either way for this call, which is correct: an error here would
 * let anyone probe which emails are registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = Linking.createURL('/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

/**
 * Completes a reset: exchanges the recovery `code` from the emailed link for a session (same
 * exchangeCodeForSession mechanism googleAuth.service.ts uses for the OAuth code), applies the
 * new password to it, then signs that temporary session back out. The user still logs in for
 * real afterward through authStore/the Express backend — this client only ever exists to
 * perform the recovery handshake itself, same boundary lib/supabase.ts documents for OAuth.
 */
export async function confirmPasswordReset(code: string, newPassword: string): Promise<void> {
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error('This reset link is invalid or has expired. Request a new one.');

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message);

  await supabase.auth.signOut();
}
