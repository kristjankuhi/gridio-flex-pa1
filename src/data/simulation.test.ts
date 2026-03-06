import { describe, it, expect } from 'vitest';
import { runSimulation } from './simulation';
import { addMinutes, startOfDay } from 'date-fns';
import type { TimeBlock, PriceBlock } from '../types';

function makeTimeBlocks(count = 4): TimeBlock[] {
  const base = startOfDay(new Date('2026-03-10'));
  return Array.from({ length: count }, (_, i) => ({
    timestamp: addMinutes(base, i * 15),
    flexibleKwh: 100,
    nonFlexibleKwh: 40,
    priceEurMwh: 50,
  }));
}

function makePriceBlocks(price: number, count = 4): PriceBlock[] {
  const base = startOfDay(new Date('2026-03-10'));
  return Array.from({ length: count }, (_, i) => ({
    timestamp: addMinutes(base, i * 15),
    priceEurMwh: price,
  }));
}

describe('runSimulation', () => {
  it('returns same structure as baseline when price unchanged', () => {
    const baseline = makeTimeBlocks();
    const newPrices = makePriceBlocks(50); // same as baseline
    const result = runSimulation(baseline, newPrices);
    result.projected.forEach((block, i) => {
      expect(block.flexibleKwh).toBeCloseTo(baseline[i].flexibleKwh, 1);
    });
  });

  it('increases flexible load when price decreases', () => {
    const baseline = makeTimeBlocks();
    const newPrices = makePriceBlocks(25); // 50% cheaper
    const result = runSimulation(baseline, newPrices);
    result.projected.forEach((block, i) => {
      expect(block.flexibleKwh).toBeGreaterThan(baseline[i].flexibleKwh);
    });
  });

  it('decreases flexible load when price increases', () => {
    const baseline = makeTimeBlocks();
    const newPrices = makePriceBlocks(100); // 2x expensive
    const result = runSimulation(baseline, newPrices);
    result.projected.forEach((block, i) => {
      expect(block.flexibleKwh).toBeLessThan(baseline[i].flexibleKwh);
    });
  });

  it('non-flexible load is unchanged', () => {
    const baseline = makeTimeBlocks();
    const newPrices = makePriceBlocks(25);
    const result = runSimulation(baseline, newPrices);
    result.projected.forEach((block, i) => {
      expect(block.nonFlexibleKwh).toBeCloseTo(baseline[i].nonFlexibleKwh, 5);
    });
  });
});
