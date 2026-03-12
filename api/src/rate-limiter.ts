// 인메모리 rate limiter (IP당 분당 10건)
const requests = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000; // 1분

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// 오래된 항목 주기적 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requests) {
    if (now > entry.resetAt) requests.delete(ip);
  }
}, 5 * 60_000);
