import React, { createContext, useContext, useState, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { nanoid } from 'nanoid';
import type { PriceBlock, PriceCurveVersion } from '../types';

// --- Pure helpers (exported for testing) ---

export function computeChangedBlocks(
  base: PriceBlock[],
  edited: PriceBlock[]
): number {
  return edited.reduce((count, block, i) => {
    const baseBlock = base[i];
    if (!baseBlock) return count;
    return Math.abs(block.priceEurMwh - baseBlock.priceEurMwh) > 0.001
      ? count + 1
      : count;
  }, 0);
}

export function buildVersionSummary(
  base: PriceBlock[],
  edited: PriceBlock[]
): string {
  const changedBlocks = edited.filter((block, i) => {
    const baseBlock = base[i];
    return (
      baseBlock && Math.abs(block.priceEurMwh - baseBlock.priceEurMwh) > 0.001
    );
  });

  if (changedBlocks.length === 0) return 'No changes';

  const dates = [
    ...new Set(changedBlocks.map((b) => format(b.timestamp, 'd MMM'))),
  ];
  const dateStr =
    dates.length === 1 ? dates[0] : `${dates[0]}–${dates[dates.length - 1]}`;
  return `${changedBlocks.length} block${changedBlocks.length > 1 ? 's' : ''} changed on ${dateStr}`;
}

// --- Context ---

interface PriceCurveStore {
  versions: PriceCurveVersion[];
  activeVersion: PriceCurveVersion | null;
  saveVersion: (newBlocks: PriceBlock[], baseBlocks: PriceBlock[]) => void;
  restoreVersion: (id: string) => void;
  getBlocksForDate: (date: Date) => PriceBlock[];
}

const PriceCurveContext = createContext<PriceCurveStore | null>(null);

export function PriceCurveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [versions, setVersions] = useState<PriceCurveVersion[]>([]);

  const activeVersion = versions.find((v) => v.isActive) ?? null;

  const saveVersion = useCallback(
    (newBlocks: PriceBlock[], baseBlocks: PriceBlock[]) => {
      const summary = buildVersionSummary(baseBlocks, newBlocks);
      const newVersion: PriceCurveVersion = {
        id: nanoid(),
        createdAt: new Date(),
        blocks: newBlocks,
        summary,
        isActive: true,
      };
      setVersions((prev) => [
        newVersion,
        ...prev.map((v) => ({ ...v, isActive: false })),
      ]);
    },
    []
  );

  const restoreVersion = useCallback((id: string) => {
    setVersions((prev) => prev.map((v) => ({ ...v, isActive: v.id === id })));
  }, []);

  const getBlocksForDate = useCallback(
    (date: Date): PriceBlock[] => {
      if (!activeVersion) return [];
      return activeVersion.blocks.filter((b) => isSameDay(b.timestamp, date));
    },
    [activeVersion]
  );

  return (
    <PriceCurveContext.Provider
      value={{
        versions,
        activeVersion,
        saveVersion,
        restoreVersion,
        getBlocksForDate,
      }}
    >
      {children}
    </PriceCurveContext.Provider>
  );
}

export function usePriceCurve(): PriceCurveStore {
  const ctx = useContext(PriceCurveContext);
  if (!ctx)
    throw new Error('usePriceCurve must be used within PriceCurveProvider');
  return ctx;
}
