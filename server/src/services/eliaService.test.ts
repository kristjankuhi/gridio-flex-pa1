import { describe, it, expect } from 'vitest';
import {
  getImbalancePrice,
  getMfrrMarginalPrice,
  getImbalancePriceRange,
} from './eliaService';

describe('eliaService getters', () => {
  it('returns null when cache is empty', () => {
    const result = getImbalancePrice(new Date('2025-06-01T12:00:00Z'));
    expect(result).toBeNull();
  });

  it('getMfrrMarginalPrice returns null when cache is empty', () => {
    const result = getMfrrMarginalPrice(new Date('2025-06-01T12:00:00Z'));
    expect(result).toBeNull();
  });

  it('getImbalancePriceRange returns empty array when cache is empty', () => {
    const result = getImbalancePriceRange(
      new Date('2025-06-01T00:00:00Z'),
      new Date('2025-06-01T01:00:00Z')
    );
    expect(result).toEqual([]);
  });
});
