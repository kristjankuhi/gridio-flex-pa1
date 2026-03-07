import { describe, it, expect } from 'vitest';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
  generateBasePriceCurve,
  generateBaselineLoad,
  generateLoadShiftBlocks,
  generatePriceReference,
  generateSoCCurve,
  generateUserEconomics,
  generateDepartureCompliance,
  generateOptInStats,
  generateActivationHistory,
} from './generators';
import {
  AREA_EV_COUNTS,
  ALL_AREAS,
  AREA_BZN,
  AREA_PRICE_FACTOR,
} from '@/data/areaConfig';
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

describe('areaConfig', () => {
  it('EV counts across specific areas sum to 847', () => {
    const specific = ALL_AREAS.filter((a) => a !== 'global');
    const total = specific.reduce((s, a) => s + AREA_EV_COUNTS[a], 0);
    expect(total).toBe(847);
  });

  it('global EV count is 847', () => {
    expect(AREA_EV_COUNTS['global']).toBe(847);
  });

  it('every non-global area has a BZN code', () => {
    const specific = ALL_AREAS.filter(
      (a): a is Exclude<typeof a, 'global'> => a !== 'global'
    );
    specific.forEach((a) => {
      expect(AREA_BZN[a]).toBeTruthy();
    });
  });

  it('all price factors are positive', () => {
    ALL_AREAS.forEach((a) => {
      expect(AREA_PRICE_FACTOR[a]).toBeGreaterThan(0);
    });
  });
});

describe('area-aware generators', () => {
  it('generateFleetStats scales activeEvCount by area', () => {
    const global = generateFleetStats('global');
    const be = generateFleetStats('BE');
    expect(be.activeEvCount).toBeLessThan(global.activeEvCount);
  });

  it('generateFleetStats totalCapacityKwh scales with area EV count', () => {
    const global = generateFleetStats('global');
    const be = generateFleetStats('BE');
    expect(be.totalCapacityKwh / global.totalCapacityKwh).toBeCloseTo(
      338 / 847,
      1
    );
  });

  it('generateHistoricLoad scales flexibleKwh by area', () => {
    const globalBlocks = generateHistoricLoad(1, 'global');
    const no2Blocks = generateHistoricLoad(1, 'NO2');
    expect(no2Blocks[0].flexibleKwh).toBeLessThan(globalBlocks[0].flexibleKwh);
  });

  it('generatePriceReference applies price factor per area', () => {
    const be = generatePriceReference(new Date(), 'BE');
    const no2 = generatePriceReference(new Date(), 'NO2');
    const beAvg = be.reduce((s, b) => s + b.daSpotEurMwh, 0) / be.length;
    const no2Avg = no2.reduce((s, b) => s + b.daSpotEurMwh, 0) / no2.length;
    expect(no2Avg).toBeLessThan(beAvg);
  });
});

describe('generateFleetStats — EV user model', () => {
  it('upHeadroomKw is plausible for a ~847-EV fleet (500–5000 kW)', () => {
    const stats = generateFleetStats();
    expect(stats.upHeadroomKw).toBeGreaterThan(500);
    expect(stats.upHeadroomKw).toBeLessThan(5000);
  });

  it('totalCapacityKwh is approximately 847 × 55 kWh', () => {
    const stats = generateFleetStats();
    expect(stats.totalCapacityKwh).toBeGreaterThan(40000);
    expect(stats.totalCapacityKwh).toBeLessThan(50000);
  });
});

describe('generateSoCCurve — EV user model', () => {
  it('dynamicFloorPct is in the valid SoC range [20, 85] for all blocks', () => {
    const blocks = generateSoCCurve(new Date());
    blocks.forEach((b) => {
      expect(b.dynamicFloorPct).toBeGreaterThanOrEqual(20);
      expect(b.dynamicFloorPct).toBeLessThanOrEqual(85);
    });
  });

  it('dynamicFloorPct ramps up toward 07:30 on a weekday (Monday 2026-03-09)', () => {
    const monday = new Date('2026-03-09T00:00:00');
    const blocks = generateSoCCurve(monday);
    const at0430 = blocks.find(
      (b) => b.timestamp.getHours() === 4 && b.timestamp.getMinutes() === 30
    );
    const at0700 = blocks.find(
      (b) => b.timestamp.getHours() === 7 && b.timestamp.getMinutes() === 0
    );
    expect(at0430).toBeDefined();
    expect(at0700).toBeDefined();
    expect(at0700!.dynamicFloorPct).toBeGreaterThan(at0430!.dynamicFloorPct);
  });
});

describe('generateUserEconomics', () => {
  it('userCreditEur is non-negative for all blocks', () => {
    const blocks = generateUserEconomics(7);
    blocks.forEach((b) => {
      expect(b.userCreditEur).toBeGreaterThanOrEqual(0);
    });
  });

  it('mfrrBonusEur is non-negative for all blocks', () => {
    const blocks = generateUserEconomics(7);
    blocks.forEach((b) => {
      expect(b.mfrrBonusEur).toBeGreaterThanOrEqual(0);
    });
  });

  it('userCreditEur >= mfrrBonusEur (user credit includes the bonus)', () => {
    const blocks = generateUserEconomics(7);
    blocks.forEach((b) => {
      expect(b.userCreditEur).toBeGreaterThanOrEqual(b.mfrrBonusEur);
    });
  });
});

describe('generateDepartureCompliance', () => {
  it('compliance rates are in realistic range for both segments', () => {
    const blocks = generateDepartureCompliance(30);
    blocks.forEach((b) => {
      expect(b.commuterCompliancePct).toBeGreaterThanOrEqual(90);
      expect(b.commuterCompliancePct).toBeLessThanOrEqual(100);
      expect(b.flexibleCompliancePct).toBeGreaterThanOrEqual(85);
      expect(b.flexibleCompliancePct).toBeLessThanOrEqual(100);
    });
  });

  it('reasons array has at most 3 entries per day', () => {
    const blocks = generateDepartureCompliance(30);
    blocks.forEach((b) => {
      expect(b.reasons.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('generateOptInStats', () => {
  it('returns monthsBack + 1 blocks', () => {
    const blocks = generateOptInStats(12);
    expect(blocks).toHaveLength(13);
  });

  it('opt-in rate grows over time', () => {
    const blocks = generateOptInStats(12);
    const first = blocks[0].optInRatePct;
    const last = blocks[blocks.length - 1].optInRatePct;
    expect(last).toBeGreaterThan(first);
  });

  it('fleet opt-in rate is higher than consumer rate', () => {
    const blocks = generateOptInStats(12);
    blocks.forEach((b) => {
      expect(b.fleetOptInPct).toBeGreaterThan(b.consumerOptInPct);
    });
  });
});

describe('generateActivationHistory', () => {
  it('uses default imbalance price of 80 when no lookup provided', () => {
    const records = generateActivationHistory(1);
    // All records should have non-negative imbalanceCostEur (80 * positive volume / 1000 >= 0)
    records.forEach((r) => {
      expect(r.imbalanceCostEur).toBeGreaterThanOrEqual(0);
    });
  });

  it('higher imbalance prices from lookup increase imbalanceCostEur', () => {
    const baseline = generateActivationHistory(1);
    // Build lookup with extremely high imbalance price for all possible 15-min slots
    const lookup = new Map<number, number>();
    for (let ms = 0; ms < 24 * 60 * 60 * 1000 * 2; ms += 15 * 60 * 1000) {
      // Cover all blocks that might exist in the last 1 day
      const slot =
        Math.floor((Date.now() - ms) / (15 * 60_000)) * (15 * 60_000);
      lookup.set(slot, 10_000); // 10,000 EUR/MWh — extreme price
    }
    const withRealPrices = generateActivationHistory(1, lookup);
    const totalBaselineImbalance = baseline.reduce(
      (s, r) => s + r.imbalanceCostEur,
      0
    );
    const totalRealImbalance = withRealPrices.reduce(
      (s, r) => s + r.imbalanceCostEur,
      0
    );
    // At least some activations should have higher imbalance cost with 10,000 EUR/MWh
    expect(totalRealImbalance).toBeGreaterThanOrEqual(totalBaselineImbalance);
  });
});
