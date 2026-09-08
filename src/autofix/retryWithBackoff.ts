export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retries `attempt` with exponential backoff. Returns the number of attempts
 * made and whether the final attempt succeeded.
 */
export async function retryWithBackoff(
  attempt: () => Promise<void>,
  options: RetryOptions,
): Promise<{ succeeded: boolean; attempts: number; lastError?: unknown }> {
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attemptNumber = 1; attemptNumber <= options.maxAttempts; attemptNumber++) {
    try {
      await attempt();
      return { succeeded: true, attempts: attemptNumber };
    } catch (error) {
      lastError = error;
      const isLastAttempt = attemptNumber === options.maxAttempts;
      if (!isLastAttempt) {
        await sleep(options.baseDelayMs * 2 ** (attemptNumber - 1));
      }
    }
  }

  return { succeeded: false, attempts: options.maxAttempts, lastError };
}
