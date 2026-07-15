export interface FetchJsonOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
  fetcher?: typeof fetch;
}

export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await (options.fetcher ?? fetch)(url, {
      headers: options.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`UPSTREAM_HTTP_${response.status}`);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('UPSTREAM_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
