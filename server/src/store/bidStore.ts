import type { BidBlock } from '@/types';

interface BidVersion {
  id: string;
  date: string;
  savedAt: Date;
  blocks: BidBlock[];
}

const store = new Map<string, BidVersion[]>();

export function getBids(date: string): BidBlock[] {
  const versions = store.get(date);
  if (!versions || versions.length === 0) return [];
  return versions[versions.length - 1].blocks;
}

export function saveBids(date: string, blocks: BidBlock[]): BidVersion {
  const version: BidVersion = {
    id: `bids_${date}_${Date.now()}`,
    date,
    savedAt: new Date(),
    blocks,
  };
  const existing = store.get(date) ?? [];
  store.set(date, [...existing, version]);
  return version;
}
