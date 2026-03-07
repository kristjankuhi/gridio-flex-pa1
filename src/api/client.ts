import type {
  FleetStats,
  TimeBlock,
  PriceBlock,
  PriceCurveVersion,
  PriceReferenceBlock,
  SimulationResult,
  TimeWindow,
  SoCBlock,
  BidBlock,
  MarketArea,
} from '@/types';

const BASE = 'http://localhost:3000/api/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  fleet: {
    stats: (): Promise<FleetStats> => get('/fleet/stats'),
    load: (
      window: TimeWindow,
      area: MarketArea = 'global'
    ): Promise<{
      window: TimeWindow;
      simulatedNow: string;
      blocks: TimeBlock[];
    }> => get(`/fleet/load?window=${window}&area=${area}`),
    soc: (date: string): Promise<SoCBlock[]> => get(`/fleet/soc?date=${date}`),
  },
  priceCurve: {
    get: (date: string): Promise<PriceBlock[]> =>
      get(`/price-curve?date=${date}`),
    versions: (date?: string): Promise<PriceCurveVersion[]> =>
      get(`/price-curve/versions${date ? `?date=${date}` : ''}`),
    save: (date: string, blocks: PriceBlock[]): Promise<PriceCurveVersion> =>
      post('/price-curve/versions', { date, blocks }),
    restore: (id: string): Promise<PriceCurveVersion> =>
      post(`/price-curve/versions/${id}/restore`, {}),
  },
  simulation: {
    run: (
      date: string,
      newPriceBlocks: PriceBlock[]
    ): Promise<SimulationResult> =>
      post('/simulation/run', { date, newPriceBlocks }),
  },
  market: {
    referencePrices: (
      date: string,
      area: MarketArea = 'global'
    ): Promise<PriceReferenceBlock[]> =>
      get(`/market/reference-prices?date=${date}&area=${area}`),
  },
  bids: {
    get: (date: string): Promise<BidBlock[]> => get(`/bids?date=${date}`),
    save: (
      date: string,
      blocks: BidBlock[]
    ): Promise<{ id: string; date: string; savedAt: string }> =>
      post('/bids', { date, blocks }),
  },
};
