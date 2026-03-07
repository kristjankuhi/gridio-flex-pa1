import { describe, it, expect } from 'vitest';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
  generateBasePriceCurve,
  generateBaselineLoad,
  generateLoadShiftBlocks,
  generateSoCCurve,
  generateUserEconomics,
  generateDepartureCompliance,
  generateOptInStats,
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

  it('managed load differs from baseline (price shift has an effect)', () => {
    const baseline = generateBaselineLoad(1);
    const managed = generateHistoricLoad(1);
    // At least some blocks should differ in flexibleKwh due to price shifting
    const diffCount = baseline.filter(
      (b, i) => Math.abs(b.flexibleKwh - managed[i].flexibleKwh) > 0.01
    ).length;
    expect(diffCount).toBeGreaterThan(0);
  });

  it('savingsEur is consistent with deltaKwh sign', () => {
    const shift = generateLoadShiftBlocks(1);
    shift.forEach((b) => {
      if (b.daSpotEurMwh > 0) {
        // savingsEur and deltaKwh should have opposite signs (removing load = positive savings)
        if (b.deltaKwh < 0) expect(b.savingsEur).toBeGreaterThanOrEqual(0);
        if (b.deltaKwh > 0) expect(b.savingsEur).toBeLessThanOrEqual(0);
      }
    });
  });
});

describe('generateFleetStats (updated)', () => {
  it('returns plausible MW headroom for mFRR bids', () => {
    const stats = generateFleetStats();
    // With 55 kWh batteries and 7.4 kW chargers, headroom should be 0.5–5 MW
    expect(stats.upHeadroomKw).toBeGreaterThan(500);
    expect(stats.upHeadroomKw).toBeLessThan(5000);
    expect(stats.downHeadroomKw).toBeGreaterThanOrEqual(0);
    expect(stats.downHeadroomKw).toBeLessThan(5000);
  });

  it('returns updated total capacity for 55 kWh batteries', () => {
    const stats = generateFleetStats();
    // 847 × 55 = 46,585 kWh
    expect(stats.totalCapacityKwh).toBeCloseTo(46_585, -2);
  });
});

describe('generateSoCCurve', () => {
  it('returns 96 blocks for a full day', () => {
    const blocks = generateSoCCurve(new Date());
    expect(blocks).toHaveLength(96);
  });

  it('includes dynamicFloorPct on every block', () => {
    const blocks = generateSoCCurve(new Date());
    blocks.forEach((b) => {
      expect(typeof b.dynamicFloorPct).toBe('number');
      expect(b.dynamicFloorPct).toBeGreaterThanOrEqual(20);
      expect(b.dynamicFloorPct).toBeLessThanOrEqual(85);
    });
  });

  it('dynamicFloorPct rises toward 07:30 on a weekday', () => {
    // Use a known weekday: 2026-03-09 (Monday)
    const monday = new Date('2026-03-09T00:00:00');
    const blocks = generateSoCCurve(monday);
    // Block at 04:30 (index 18) — ramp starts
    const at0430 = blocks[18];
    // Block at 07:15 (index 29) — near departure
    const at0715 = blocks[29];
    expect(at0715.dynamicFloorPct).toBeGreaterThan(at0430.dynamicFloorPct);
  });

  it('upHeadroomKwh is non-negative', () => {
    const blocks = generateSoCCurve(new Date());
    blocks.forEach((b) => {
      expect(b.upHeadroomKwh).toBeGreaterThanOrEqual(0);
      expect(b.downHeadroomKwh).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('generateUserEconomics', () => {
  it('returns same number of blocks as generateLoadShiftBlocks for same daysBack', () => {
    const blocks = generateUserEconomics(7);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('all credit amounts are non-negative', () => {
    const blocks = generateUserEconomics(7);
    blocks.forEach((b) => {
      expect(b.userCreditEur).toBeGreaterThanOrEqual(0);
      expect(b.gridioRetainedEur).toBeGreaterThanOrEqual(0);
      expect(b.mfrrBonusEur).toBeGreaterThanOrEqual(0);
    });
  });

  it('userCreditEur includes mfrrBonusEur', () => {
    const blocks = generateUserEconomics(30);
    blocks.forEach((b) => {
      expect(b.userCreditEur).toBeGreaterThanOrEqual(b.mfrrBonusEur);
    });
  });
});

describe('generateDepartureCompliance', () => {
  it('returns one block per day', () => {
    const blocks = generateDepartureCompliance(30);
    expect(blocks).toHaveLength(30);
  });

  it('compliance rates are within realistic range', () => {
    const blocks = generateDepartureCompliance(30);
    blocks.forEach((b) => {
      expect(b.commuterCompliancePct).toBeGreaterThanOrEqual(90);
      expect(b.commuterCompliancePct).toBeLessThanOrEqual(100);
      expect(b.flexibleCompliancePct).toBeGreaterThanOrEqual(85);
      expect(b.flexibleCompliancePct).toBeLessThanOrEqual(100);
    });
  });

  it('reasons array has at most 3 entries', () => {
    const blocks = generateDepartureCompliance(30);
    blocks.forEach((b) => {
      expect(b.reasons.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('generateOptInStats', () => {
  it('returns monthsBack+1 blocks (inclusive of current month)', () => {
    const blocks = generateOptInStats(12);
    expect(blocks).toHaveLength(13); // 0..12 inclusive
  });

  it('opt-in rate grows over time', () => {
    const blocks = generateOptInStats(12);
    // Last should be higher than first
    expect(blocks[blocks.length - 1].optInRatePct).toBeGreaterThan(
      blocks[0].optInRatePct
    );
  });

  it('fleet opt-in is higher than consumer opt-in', () => {
    const blocks = generateOptInStats(12);
    blocks.forEach((b) => {
      expect(b.fleetOptInPct).toBeGreaterThan(b.consumerOptInPct);
    });
  });
});
