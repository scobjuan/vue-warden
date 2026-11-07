/**
 * Runs a user callback and routes any error to `onError`.
 * @param fn - Callback to run.
 * @param onError - Error reporter, itself protected.
 * @param fallback - Value returned when `fn` throws.
 * @returns The callback result or the fallback.
 */
export function safe<T, F>(
  fn: () => T,
  onError: ((error: unknown) => void) | undefined,
  fallback: F
): T | F {
  try {
    return fn()
  } catch (error) {
    report(error, onError)
    return fallback
  }
}

/**
 * Reports an error without ever throwing.
 * @param error - Error to report.
 * @param onError - Optional user reporter.
 */
export function report(
  error: unknown,
  onError: ((error: unknown) => void) | undefined
): void {
  if (!onError) return
  try {
    onError(error)
  } catch {
    // The reporter must never break the host app.
  }
}
