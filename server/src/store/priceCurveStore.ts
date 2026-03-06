import { nanoid } from 'nanoid';
import { format } from 'date-fns';
import { generateBasePriceCurve } from '@/data/generators';
import type { PriceCurveVersion, PriceBlock } from '@/types';

function seedInitialVersion(): PriceCurveVersion {
  const today = new Date();
  const blocks = generateBasePriceCurve(today);
  return {
    id: nanoid(),
    createdAt: new Date(),
    blocks,
    summary: 'Initial price curve (auto-generated)',
    isActive: true,
  };
}

let versions: PriceCurveVersion[] = [seedInitialVersion()];

export function getVersions(): PriceCurveVersion[] {
  return versions;
}

export function getActiveVersion(): PriceCurveVersion | undefined {
  return versions.find((v) => v.isActive);
}

export function saveVersion(blocks: PriceBlock[]): PriceCurveVersion {
  const active = getActiveVersion();
  const changedBlocks = active
    ? blocks.filter((b, i) => {
        const ab = active.blocks[i];
        return ab && Math.abs(b.priceEurMwh - ab.priceEurMwh) > 0.001;
      })
    : blocks;

  const dates = [
    ...new Set(
      changedBlocks.map((b) => format(new Date(b.timestamp), 'd MMM'))
    ),
  ];
  const dateStr =
    dates.length === 1 ? dates[0] : `${dates[0]}–${dates[dates.length - 1]}`;
  const summary =
    changedBlocks.length > 0
      ? `${changedBlocks.length} block${changedBlocks.length > 1 ? 's' : ''} changed on ${dateStr}`
      : 'No changes';

  const newVersion: PriceCurveVersion = {
    id: nanoid(),
    createdAt: new Date(),
    blocks,
    summary,
    isActive: true,
  };

  versions = [newVersion, ...versions.map((v) => ({ ...v, isActive: false }))];
  return newVersion;
}

export function restoreVersion(id: string): PriceCurveVersion | null {
  const target = versions.find((v) => v.id === id);
  if (!target) return null;
  versions = versions.map((v) => ({ ...v, isActive: v.id === id }));
  return { ...target, isActive: true };
}
