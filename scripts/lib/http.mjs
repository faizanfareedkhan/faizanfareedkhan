const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch JSON with a timeout and exponential-backoff retries.
 * Transient failures (5xx, 429, network errors, HTML error pages) are retried.
 */
export async function fetchJson(url, options = {}, { retries = 3, timeoutMs = 20_000, label = url } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.text();
      if (!response.ok) {
        const error = new Error(`${label}: HTTP ${response.status} ${body.slice(0, 160)}`);
        error.retryable = response.status >= 500 || response.status === 429;
        throw error;
      }
      try {
        return JSON.parse(body);
      } catch {
        const error = new Error(`${label}: expected JSON, got ${body.slice(0, 120)}`);
        error.retryable = true;
        throw error;
      }
    } catch (error) {
      lastError = error;
      const retryable = error.retryable ?? true;
      if (!retryable || attempt === retries) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
