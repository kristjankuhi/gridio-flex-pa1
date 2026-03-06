import { describe, it, expect } from 'vitest';
import { buildVersionSummary, computeChangedBlocks } from './priceCurveStore';
import { addMinutes, startOfDay } from 'date-fns';
import type { PriceBlock } from '../types';

function makeBlocks(date: Date, count = 96): PriceBlock[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: addMinutes(startOfDay(date), i * 15),
    priceEurMwh: 50,
  }));
}

describe('computeChangedBlocks', () => {
  it('returns count of blocks where price differs', () => {
    const base = makeBlocks(new Date('2026-03-10'));
    const edited = [...base];
    edited[4] = { ...edited[4], priceEurMwh: 99 };
    edited[5] = { ...edited[5], priceEurMwh: 99 };
    expect(computeChangedBlocks(base, edited)).toBe(2);
  });

  it('returns 0 when nothing changed', () => {
    const base = makeBlocks(new Date('2026-03-10'));
    expect(computeChangedBlocks(base, base)).toBe(0);
  });
});

describe('buildVersionSummary', () => {
  it('generates summary for changes on one date', () => {
    const date = new Date('2026-03-10');
    const base = makeBlocks(date);
    const edited = [...base];
    edited[4] = { ...edited[4], priceEurMwh: 99 };
    edited[5] = { ...edited[5], priceEurMwh: 99 };
    const summary = buildVersionSummary(base, edited);
    expect(summary).toMatch(/2 blocks changed/);
    expect(summary).toMatch(/10 Mar/);
  });
});
