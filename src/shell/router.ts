export type Route = { kind: 'menu' } | { kind: 'demo'; id: string };

export function parseHash(hash: string): Route {
  const m = /^#\/([a-z0-9-]+)\/?$/.exec(hash);
  return m ? { kind: 'demo', id: m[1] } : { kind: 'menu' };
}
