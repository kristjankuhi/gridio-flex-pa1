import { describe, it, expect } from 'vitest';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
  generateBasePriceCurve,
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
  it('returns 96 blocks for 1 day', () => {
    const blocks = generateHistoricLoad(1);
    expect(blocks).toHaveLength(96);
  });

  it('each block has non-negative volumes', () => {
    const blocks = generateHistoricLoad(1);
    blocks.forEach((b) => {
      expect(b.flexibleKwh).toBeGreaterThanOrEqual(0);
      expect(b.nonFlexibleKwh).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns 96 * 365 blocks for 1 year', () => {
    const blocks = generateHistoricLoad(365);
    expect(blocks).toHaveLength(96 * 365);
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
