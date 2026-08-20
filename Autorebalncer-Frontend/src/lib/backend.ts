import type { StatusResponse, RebalanceResponse } from './types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function fetchStatus(address?: string): Promise<StatusResponse> {
  const url = address
    ? `${BACKEND_URL}/status?address=${encodeURIComponent(address)}`
    : `${BACKEND_URL}/status`;
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Status fetch failed with HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data || json;
}

export async function checkRebalance(address?: string): Promise<RebalanceResponse> {
  const res = await fetch(`${BACKEND_URL}/rebalance/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(address ? { address } : {}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Rebalance check failed with HTTP ${res.status}`);
  }
  return res.json();
}
