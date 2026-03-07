import { subYears, format, addDays } from 'date-fns';

interface HourlyPrice {
  timestamp: Date;
  priceEurMwh: number;
}

let priceCache: HourlyPrice[] = [];

export async function fetchBelgianPrices(
  from: Date,
  to: Date
): Promise<HourlyPrice[]> {
  const url = `https://api.energy-charts.info/price?bzn=BE&start=${format(from, 'yyyy-MM-dd')}&end=${format(to, 'yyyy-MM-dd')}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`energy-charts API error: ${res.status}`);

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
  const to = addDays(new Date(), 2);
  const from = subYears(to, 2);

  console.log(
    'Fetching 2 years of Belgian DA prices from energy-charts.info...'
  );
  try {
    priceCache = await fetchBelgianPrices(from, to);
    console.log(
      `✓ Cached ${priceCache.length} hourly price points (${format(from, 'yyyy-MM-dd')} – ${format(to, 'yyyy-MM-dd')})`
    );
  } catch (err) {
    console.warn(
      '⚠ Price fetch failed, falling back to synthetic prices:',
      err
    );
  }
}

export function getPriceCacheFor15MinBlock(timestamp: Date): number | null {
  if (priceCache.length === 0) return null;

  const hourStart = new Date(timestamp);
  hourStart.setMinutes(0, 0, 0);

  const match = priceCache.find(
    (p) => Math.abs(p.timestamp.getTime() - hourStart.getTime()) < 60000
  );
  return match?.priceEurMwh ?? null;
}

export function applyRealPrices<
  T extends { timestamp: Date; priceEurMwh: number },
>(blocks: T[]): T[] {
  if (priceCache.length === 0) return blocks;
  return blocks.map((b) => {
    const realPrice = getPriceCacheFor15MinBlock(b.timestamp);
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
