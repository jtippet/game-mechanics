/** A CanvasRenderingContext2D stand-in that records method names and accepts any property. */
export function stubContext(): CanvasRenderingContext2D & { calls: string[] } {
  const calls: string[] = [];
  const target: Record<string, unknown> = { calls, measureText: (s: string) => ({ width: s.length * 5 }) };
  return new Proxy(target, {
    get: (t, k) => (typeof k === 'string' && k in t) ? t[k] : (...args: unknown[]) => { calls.push(String(k)); void args; },
    set: (t, k, v) => { t[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D & { calls: string[] };
}
