export interface HiveResult {
  deepfakeScore: number;
  aiGeneratedScore: number;
  rawResponse: unknown;
}

export async function analyzeWithHive(
  imageUrl: string
): Promise<HiveResult> {
  const apiKey = process.env.HIVE_API_KEY;

  if (!apiKey) {
    throw new Error('Hive API key not configured');
  }

  const response = await fetch(
    'https://api.thehive.ai/api/v2/task/sync',
    {
      method: 'POST',
      headers: {
        Authorization: `token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const data = (await response.json()) as Record<string, any>;
  const output: any[] = data.status?.[0]?.response?.output || [];

  let deepfakeScore = 0;
  let aiGeneratedScore = 0;

  for (const item of output) {
    for (const cls of item.classes || []) {
      if (cls.class === 'yes_deepfake') deepfakeScore = cls.score || 0;
      if (cls.class === 'ai_generated') aiGeneratedScore = cls.score || 0;
    }
  }

  return { deepfakeScore, aiGeneratedScore, rawResponse: data };
}
