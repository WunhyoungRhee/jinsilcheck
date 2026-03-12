export interface SightEngineResult {
  deepfakeScore: number;
  faces: number;
  rawResponse: unknown;
}

export async function analyzeWithSightEngine(
  imageUrl: string
): Promise<SightEngineResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    throw new Error('SightEngine API credentials not configured');
  }

  const params = new URLSearchParams({
    url: imageUrl,
    models: 'deepfake',
    api_user: apiUser,
    api_secret: apiSecret,
  });

  const response = await fetch(
    `https://api.sightengine.com/1.0/check.json?${params}`,
    { method: 'GET', signal: AbortSignal.timeout(15000) }
  );

  const data = (await response.json()) as Record<string, any>;

  if (data.status !== 'success') {
    throw new Error(
      `SightEngine error: ${data.error?.message || 'unknown'}`
    );
  }

  const faces: any[] = data.faces || [];
  const maxScore =
    faces.length > 0
      ? Math.max(...faces.map((f: any) => f.deepfake || 0))
      : 0;

  return {
    deepfakeScore: maxScore,
    faces: faces.length,
    rawResponse: data,
  };
}
