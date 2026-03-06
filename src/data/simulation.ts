import type { TimeBlock, PriceBlock, SimulationResult } from '../types';

// Price elasticity: flexible load responds to price delta.
// ELASTICITY of -0.4 means a 10% price decrease → ~4% load increase.
// This is a simplified linear model for the POC.
const ELASTICITY = -0.4;

export function runSimulation(
  baseline: TimeBlock[],
  newPrices: PriceBlock[]
): SimulationResult {
  const priceMap = new Map(
    newPrices.map((p) => [p.timestamp.getTime(), p.priceEurMwh])
  );

  const projected: TimeBlock[] = baseline.map((block) => {
    const newPrice =
      priceMap.get(block.timestamp.getTime()) ?? block.priceEurMwh;
    const basePriceEurMwh = block.priceEurMwh;

    let flexibleKwh = block.flexibleKwh;

    if (basePriceEurMwh > 0) {
      const priceDeltaRatio = (newPrice - basePriceEurMwh) / basePriceEurMwh;
      const loadDeltaRatio = ELASTICITY * priceDeltaRatio;
      flexibleKwh = Math.max(0, block.flexibleKwh * (1 + loadDeltaRatio));
    }

    return {
      timestamp: block.timestamp,
      flexibleKwh,
      nonFlexibleKwh: block.nonFlexibleKwh,
      priceEurMwh: newPrice,
    };
  });

  return { baseline, projected };
}
