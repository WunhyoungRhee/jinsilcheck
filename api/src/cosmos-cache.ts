import { CosmosClient } from '@azure/cosmos';
import { createHash } from 'crypto';
import { CacheEntry } from './types';

let container: ReturnType<
  ReturnType<CosmosClient['database']>['container']
> | null = null;

function getContainer() {
  if (container) return container;

  if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) {
    return null;
  }

  const client = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
  });

  container = client
    .database(process.env.COSMOS_DB_DATABASE || 'jinsilcheck')
    .container(process.env.COSMOS_DB_CONTAINER || 'analysis-cache');

  return container;
}

export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 32);
}

export async function getCached(
  urlHash: string
): Promise<CacheEntry | null> {
  const c = getContainer();
  if (!c) return null;

  try {
    const { resource } = await c.item(urlHash, urlHash).read<CacheEntry>();
    return resource || null;
  } catch (e: any) {
    if (e.code === 404) return null;
    throw e;
  }
}

export async function setCache(entry: CacheEntry): Promise<void> {
  const c = getContainer();
  if (!c) return;

  await c.items.upsert(entry);
}
