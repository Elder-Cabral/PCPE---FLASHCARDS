/**
 * Wrapper for async operations with basic retry and error logging.
 * Returns the resolved value or throws to be handled by the caller.
 */
export async function safeCall<T>(fn: () => Promise<T>, retries = 0): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('safeCall error:', err);
    if (retries > 0) {
      // Simple exponential back‑off
      await new Promise(r => setTimeout(r, 500 * (2 - retries)));
      return safeCall(fn, retries - 1);
    }
    throw err;
  }
}
