// URL 입력 정제 — XSS 방지
export function sanitizeUrl(raw: string): string {
  // 앞뒤 공백 제거
  const trimmed = raw.trim();

  // javascript:, data:, vbscript: 프로토콜 차단
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }

  // 최대 길이 제한 (2048자)
  if (trimmed.length > 2048) {
    return '';
  }

  return trimmed;
}
