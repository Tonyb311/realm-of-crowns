// ---------------------------------------------------------------------------
// Internal HTTP dispatcher for bot API calls
// ---------------------------------------------------------------------------

import { DispatchResult } from './types';

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}/api`;

function getSimulationSecret(): string {
  return process.env.SIMULATION_SECRET || (process.env.JWT_SECRET || 'fallback').slice(0, 16);
}

export async function dispatch(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<DispatchResult> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Simulation-Secret': getSimulationSecret(),
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: any;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { raw: await res.text() };
    }

    return { status: res.status, data };
  } catch (err: any) {
    return { status: 0, data: { error: `Network error: ${err.message}` } };
  }
}

export async function get(path: string, token: string): Promise<DispatchResult> {
  return dispatch('GET', path, token);
}

export async function post(path: string, token: string, body?: unknown): Promise<DispatchResult> {
  return dispatch('POST', path, token, body);
}

export async function put(path: string, token: string, body?: unknown): Promise<DispatchResult> {
  return dispatch('PUT', path, token, body);
}

export async function patch(path: string, token: string, body?: unknown): Promise<DispatchResult> {
  return dispatch('PATCH', path, token, body);
}

export async function del(path: string, token: string, body?: unknown): Promise<DispatchResult> {
  return dispatch('DELETE', path, token, body);
}
