const API_BASE = '/api';

export async function analyzeUrl(url: string) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'url' }),
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.error?.message_ko || '오류가 발생했습니다.');
  }

  return data;
}

export async function analyzeImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/analyze-image`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.error?.message_ko || '오류가 발생했습니다.');
  }

  return data;
}
