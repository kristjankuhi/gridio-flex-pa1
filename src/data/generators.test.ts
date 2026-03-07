import { describe, it, expect } from 'vitest';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
  generateBasePriceCurve,
  generateBaselineLoad,
  generateLoadShiftBlocks,
} from './generators';
describe('generateFleetStats', () => {
  it('returns plausible fleet stats', () => {
    const stats = generateFleetStats();
    expect(stats.totalCapacityKwh).toBeGreaterThan(0);
    expect(stats.activeEvCount).toBeGreaterThan(0);
    expect(stats.avgStateOfChargePct).toBeGreaterThanOrEqual(0);
    expect(stats.avgStateOfChargePct).toBeLessThanOrEqual(100);
  });
});

describe('generateHistoricLoad', () => {
  it("returns at least 96 blocks for 1 day (includes today's partial day)", () => {
    const blocks = generateHistoricLoad(1);
    expect(blocks.length).toBeGreaterThanOrEqual(96);
    expect(blocks.length).toBeLessThanOrEqual(192);
  });

  it('each block has non-negative volumes', () => {
    const blocks = generateHistoricLoad(1);
    blocks.forEach((b) => {
      expect(b.flexibleKwh).toBeGreaterThanOrEqual(0);
      expect(b.nonFlexibleKwh).toBeGreaterThanOrEqual(0);
    });
  });

  it("returns approximately 96 * 365 blocks for 1 year (includes today's partial day)", () => {
    const blocks = generateHistoricLoad(365);
    expect(blocks.length).toBeGreaterThanOrEqual(96 * 365);
    expect(blocks.length).toBeLessThanOrEqual(96 * 366);
  });
});

describe('generateForecastLoad', () => {
  it('returns blocks for the requested number of days ahead', () => {
    const blocks = generateForecastLoad(1);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThanOrEqual(96);
  });
});

describe('generateBasePriceCurve', () => {
  it('returns 96 price blocks for a given date', () => {
    const blocks = generateBasePriceCurve(new Date());
    expect(blocks).toHaveLength(96);
  });

  it('prices are in plausible range (0–500 EUR/MWh)', () => {
    const blocks = generateBasePriceCurve(new Date());
    blocks.forEach((b) => {
      expect(b.priceEurMwh).toBeGreaterThanOrEqual(0);
      expect(b.priceEurMwh).toBeLessThanOrEqual(500);
    });
  });
});

describe('generateBaselineLoad', () => {
  it('returns same number of blocks as generateHistoricLoad for same daysBack', () => {
    const baseline = generateBaselineLoad(1);
    const managed = generateHistoricLoad(1);
    expect(baseline.length).toBe(managed.length);
  });

  it('all blocks have non-negative volumes', () => {
    const blocks = generateBaselineLoad(1);
    blocks.forEach((b) => {
      expect(b.flexibleKwh).toBeGreaterThanOrEqual(0);
      expect(b.nonFlexibleKwh).toBeGreaterThanOrEqual(0);
    });
  });

  it('baseline has same timestamps as managed', () => {
    const baseline = generateBaselineLoad(1);
    const managed = generateHistoricLoad(1);
    baseline.forEach((b, i) => {
      expect(b.timestamp.getTime()).toBe(managed[i].timestamp.getTime());
    });
  });
});

describe('generateLoadShiftBlocks', () => {
  it('returns same number of blocks as generateHistoricLoad', () => {
    const shift = generateLoadShiftBlocks(1);
    const managed = generateHistoricLoad(1);
    expect(shift.length).toBe(managed.length);
  });

  it('deltaKwh = actualKwh - baselineKwh for each block', () => {
    const shift = generateLoadShiftBlocks(1);
    shift.forEach((b) => {
      expect(b.deltaKwh).toBe(b.actualKwh - b.baselineKwh);
    });
  });

  it('all blocks have timestamps', () => {
    const shift = generateLoadShiftBlocks(1);
    shift.forEach((b) => {
      expect(b.timestamp).toBeInstanceOf(Date);
    });
  });
});
