import { describe, it, expect } from 'vitest';

describe('eliaService getters', () => {
  it('returns null when cache is empty', async () => {
    const { getImbalancePrice } = await import('./eliaService');
    const result = getImbalancePrice(new Date('2025-06-01T12:00:00Z'));
    expect(result).toBeNull();
  });

  it('getMfrrMarginalPrice returns null when cache is empty', async () => {
    const { getMfrrMarginalPrice } = await import('./eliaService');
    const result = getMfrrMarginalPrice(new Date('2025-06-01T12:00:00Z'));
    expect(result).toBeNull();
  });

  it('getImbalancePriceRange returns empty array when cache is empty', async () => {
    const { getImbalancePriceRange } = await import('./eliaService');
    const result = getImbalancePriceRange(
      new Date('2025-06-01T00:00:00Z'),
      new Date('2025-06-01T01:00:00Z')
    );
    expect(result).toEqual([]);
  });
});
