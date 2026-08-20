export function formatPct(pct: number | undefined | null): string {
  if (pct === undefined || pct === null || isNaN(pct)) return '0.0%';
  return `${pct.toFixed(1)}%`;
}

export function formatTokenAmount(raw: string | number | undefined | null, decimals = 18): string {
  if (!raw) return '0.0000';
  
  // If it's already a formatted decimal string (contains '.')
  if (typeof raw === 'string' && raw.includes('.')) {
    const num = parseFloat(raw);
    return isNaN(num) ? '0.0000' : num.toFixed(4);
  }
  
  if (typeof raw === 'number') {
    return raw.toFixed(4);
  }

  try {
    const bi = BigInt(raw);
    const divisor = 10n ** BigInt(decimals);
    const whole = bi / divisor;
    const fraction = bi % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
    return `${whole.toString()}.${fractionStr}`;
  } catch {
    const num = parseFloat(raw);
    return isNaN(num) ? '0.0000' : num.toFixed(4);
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
