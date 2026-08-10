const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://illvoice-production.up.railway.app';

function ensureFetch() {
  const g = globalThis as any;
  if (typeof g.fetch === 'function') return g.fetch;

  if (typeof g.XMLHttpRequest === 'function') {
    return (...args: any[]) => xmlHttpFetch(...(args as [any, any?]));
  }

  throw new Error('No fetch or XMLHttpRequest available');
}

function xmlHttpFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as any).url;
    const method = init?.method || 'GET';
    const headers = init?.headers || {};
    const body = init?.body;

    xhr.open(method, url as string, true);

    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        xhr.setRequestHeader(key, value as string);
      }
    });

    xhr.onload = () => {
      const responseHeaders: Record<string, string> = {};
      xhr.getAllResponseHeaders().split('\r\n').filter(Boolean).forEach((line: string) => {
        const [key, value] = line.split(': ');
        responseHeaders[key] = value;
      });
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      });
      resolve(response);
    };

    xhr.onerror = () => {
      reject(new TypeError('Network request failed'));
    };

    xhr.send(body as string | Document | null | undefined);
  });
}

export async function httpPost(path: string, body: any, token?: string | null): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetch = ensureFetch();
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function httpGet(path: string, token?: string | null): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetch = ensureFetch();
  return fetch(url, {
    method: 'GET',
    headers,
  });
}

export { BACKEND_URL };
