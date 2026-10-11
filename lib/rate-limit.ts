const globalForLimits = globalThis as unknown as { taskieLimits?: Map<string, { count: number; until: number }> };

function buckets() {
  globalForLimits.taskieLimits ??= new Map();
  return globalForLimits.taskieLimits;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/** Devuelve los segundos que faltan para volver a intentar, o 0 si se puede seguir. */
export function retryAfter(key: string, limit: number): number {
  const now = Date.now();
  const store = buckets();
  const bucket = store.get(key);
  if (!bucket || bucket.until <= now) return 0;
  return bucket.count >= limit ? Math.ceil((bucket.until - now) / 1000) : 0;
}

export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const store = buckets();
  const bucket = store.get(key);
  if (!bucket || bucket.until <= now) store.set(key, { count: 1, until: now + windowMs });
  else bucket.count += 1;
  if (store.size > 5000) {
    for (const [name, value] of store) if (value.until <= now) store.delete(name);
  }
}

export function clearFailures(key: string): void {
  buckets().delete(key);
}
