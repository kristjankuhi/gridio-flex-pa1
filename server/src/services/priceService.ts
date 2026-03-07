import { subYears, format, addDays } from 'date-fns';

interface HourlyPrice {
  timestamp: Date;
  priceEurMwh: number;
}

/** All ENTSO-E bidding zones supported by this app */
const ALL_BZN = [
  'BE',
  'NL',
  'DE-LU',
  'FR',
  'GB',
  'DK1',
  'DK2',
  'FI',
  'NO2',
  'SE3',
  'EE',
  'LV',
  'LT',
] as const;

/** One price cache per bzn string */
const priceCaches = new Map<string, HourlyPrice[]>();

export async function fetchPricesForZone(
  bzn: string,
  from: Date,
  to: Date
): Promise<HourlyPrice[]> {
  const url =
    `https://api.energy-charts.info/price?bzn=${bzn}` +
    `&start=${format(from, 'yyyy-MM-dd')}&end=${format(to, 'yyyy-MM-dd')}`;

  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`energy-charts API error ${res.status} for ${bzn}`);

  const data = (await res.json()) as {
    unix_seconds: number[];
    price: number[];
  };

  return data.unix_seconds.map((ts, i) => ({
    timestamp: new Date(ts * 1000),
    priceEurMwh: data.price[i],
  }));
}

export async function initPriceCache(): Promise<void> {
  const now = new Date();
  const to = addDays(now, 2);
  const from = subYears(now, 2);

  console.log(
    `Fetching 2 years of DA prices for ${ALL_BZN.length} zones from energy-charts.info...`
  );

  const results = await Promise.allSettled(
    ALL_BZN.map(async (bzn) => {
      const prices = await fetchPricesForZone(bzn, from, to);
      priceCaches.set(bzn, prices);
      console.log(`  ✓ ${bzn}: ${prices.length} price points`);
    })
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(
      `⚠ ${failed} zone(s) failed — falling back to synthetic prices for those zones`
    );
  }
}

export function getPriceCacheFor15MinBlock(
  timestamp: Date,
  bzn = 'BE'
): number | null {
  const cache = priceCaches.get(bzn);
  if (!cache || cache.length === 0) return null;

  const hourStart = new Date(timestamp);
  hourStart.setMinutes(0, 0, 0);

  const match = cache.find(
    (p) => Math.abs(p.timestamp.getTime() - hourStart.getTime()) < 60000
  );
  return match?.priceEurMwh ?? null;
}

export function applyRealPrices<
  T extends { timestamp: Date; priceEurMwh: number },
>(blocks: T[], bzn = 'BE'): T[] {
  const cache = priceCaches.get(bzn);
  if (!cache || cache.length === 0) return blocks;
  return blocks.map((b) => {
    const realPrice = getPriceCacheFor15MinBlock(b.timestamp, bzn);
    return realPrice !== null ? { ...b, priceEurMwh: realPrice } : b;
  });
}

export function interpolateTo15Min(hourly: HourlyPrice[]): HourlyPrice[] {
  const result: HourlyPrice[] = [];
  for (const { timestamp, priceEurMwh } of hourly) {
    for (let q = 0; q < 4; q++) {
      result.push({
        timestamp: new Date(timestamp.getTime() + q * 15 * 60000),
        priceEurMwh,
      });
    }
  }
  return result;
}

export function scheduleDailyRefresh(): void {
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setHours(13, 15, 0, 0);
  if (nextRefresh <= now) nextRefresh.setDate(nextRefresh.getDate() + 1);

  const msUntilRefresh = nextRefresh.getTime() - now.getTime();
  setTimeout(async () => {
    await initPriceCache();
    setInterval(initPriceCache, 24 * 60 * 60 * 1000);
  }, msUntilRefresh);

  console.log(
    `Next DA price refresh scheduled at ${format(nextRefresh, 'HH:mm')} CET`
  );
}
