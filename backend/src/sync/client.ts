import type { FireflyResponse } from './types.js';

export class FireflyClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!res.ok) {
      throw new Error(`Firefly API error: ${res.status} ${res.statusText} — ${url.toString()}`);
    }

    return res.json() as Promise<T>;
  }

  // Fetches all pages of a paginated endpoint.
  async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const response = await this.get<FireflyResponse<T>>(path, {
        ...params,
        page: String(page),
      });

      results.push(...response.data);

      if (page >= response.meta.pagination.total_pages) break;
      page++;
    }

    return results;
  }

  // Single page fetch (for endpoints that don't paginate, like budget limits).
  async getSingle<T>(path: string, params: Record<string, string> = {}): Promise<FireflyResponse<T>> {
    return this.get<FireflyResponse<T>>(path, params);
  }
}

export function buildClient(): FireflyClient {
  const baseUrl = process.env.FIREFLY_BASE_URL;
  const token = process.env.FIREFLY_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('FIREFLY_BASE_URL and FIREFLY_TOKEN must be set in environment');
  }

  return new FireflyClient(baseUrl, token);
}
