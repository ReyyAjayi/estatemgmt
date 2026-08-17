// Shared failed-login-attempt policy for both credential flows (staff
// password login and tenant code-pair login) — see docs/phase-0-discovery.md
// §3, "rate-limit/lock login attempts" risk mitigation.

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export function isLocked(lockedUntil: Date | null): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

export function nextLockState(currentFailedAttempts: number): {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
} {
  const attempts = currentFailedAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}
