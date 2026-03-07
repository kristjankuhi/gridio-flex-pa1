import { subDays, format } from 'date-fns';

const ELIA_BASE = 'https://opendata.elia.be/api/explore/v2.1/catalog/datasets';

/** 22 May 2024 — MARI local go-live; dataset and field names changed */
const MARI_CUTOVER = new Date('2024-05-22T00:00:00Z');

interface ImbalancePoint {
  imbalancePriceEurMwh: number;
  mfrrMarginalEurMwh: number | null;
}

/** Key = 15-min bucket start in ms (UTC) */
const cache = new Map<number, ImbalancePoint>();

function round15MinMs(ts: Date): number {
  const ms = ts.getTime();
  return ms - (ms % (15 * 60 * 1000));
}

interface Ods047Record {
  datetime: string;
  positiveimbalanceprice: number;
}

interface Ods134Record {
  datetime: string;
  imbalanceprice: number;
  marginalincrementalprice: number | null;
}

async function fetchExport<T>(
  dataset: string,
  where: string,
  select: string
): Promise<T[]> {
  const params = new URLSearchParams({
    where,
    select,
    order_by: 'datetime ASC',
    lang: 'en',
    timezone: 'UTC',
  });
  const url = `${ELIA_BASE}/${dataset}/exports/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Elia ${dataset} fetch failed: HTTP ${res.status}`);
  return res.json() as Promise<T[]>;
}

async function fetchRecords<T>(
  dataset: string,
  where: string,
  select: string,
  limit = 100
): Promise<T[]> {
  const params = new URLSearchParams({
    where,
    select,
    order_by: 'datetime ASC',
    limit: String(limit),
    lang: 'en',
    timezone: 'UTC',
  });
  const url = `${ELIA_BASE}/${dataset}/records?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Elia ${dataset} records failed: HTTP ${res.status}`);
  const body = (await res.json()) as { results: T[] };
  return body.results;
}

function storeOds047(records: Ods047Record[]): void {
  for (const r of records) {
    const key = round15MinMs(new Date(r.datetime));
    cache.set(key, {
      imbalancePriceEurMwh: r.positiveimbalanceprice,
      mfrrMarginalEurMwh: null,
    });
  }
}

function storeOds134(records: Ods134Record[]): void {
  for (const r of records) {
    const key = round15MinMs(new Date(r.datetime));
    cache.set(key, {
      imbalancePriceEurMwh: r.imbalanceprice,
      mfrrMarginalEurMwh: r.marginalincrementalprice ?? null,
    });
  }
}

async function fetchHistorical(from: Date, to: Date): Promise<void> {
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  if (from < MARI_CUTOVER) {
    const cutStr = format(MARI_CUTOVER, 'yyyy-MM-dd');
    const where = `datetime >= date'${fromStr}' AND datetime < date'${cutStr}'`;
    try {
      const recs = await fetchExport<Ods047Record>(
        'ods047',
        where,
        'datetime,positiveimbalanceprice'
      );
      storeOds047(recs);
      console.log(`  Elia ods047: ${recs.length} blocks`);
    } catch (e) {
      console.warn('Elia ods047 failed (falling back to defaults):', e);
    }
  }

  const postFrom = from < MARI_CUTOVER ? MARI_CUTOVER : from;
  if (postFrom <= to) {
    const postFromStr = format(postFrom, 'yyyy-MM-dd');
    const where = `datetime >= date'${postFromStr}' AND datetime <= date'${toStr}'`;
    try {
      const recs = await fetchExport<Ods134Record>(
        'ods134',
        where,
        'datetime,imbalanceprice,marginalincrementalprice'
      );
      storeOds134(recs);
      console.log(`  Elia ods134: ${recs.length} blocks`);
    } catch (e) {
      console.warn('Elia ods134 failed (falling back to defaults):', e);
    }
  }
}

async function refreshNearRealtime(): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const where = `datetime >= date'${today}'`;
  try {
    const recs = await fetchRecords<Ods134Record>(
      'ods162',
      where,
      'datetime,imbalanceprice,marginalincrementalprice',
      100
    );
    storeOds134(recs);
    console.log(`Elia near-RT refresh: ${recs.length} blocks`);
  } catch (e) {
    console.warn('Elia ods162 near-RT refresh failed:', e);
  }
}

export async function initEliaCache(): Promise<void> {
  const now = new Date();
  const from = subDays(now, 90);
  console.log('Fetching Elia imbalance prices (last 90 days)...');
  await fetchHistorical(from, now);
  await refreshNearRealtime();
  console.log(`Elia imbalance cache: ${cache.size} blocks`);
}

export function scheduleEliaRefresh(): void {
  const now = new Date();
  const nextDaily = new Date(now);
  nextDaily.setUTCHours(1, 0, 0, 0);
  if (nextDaily <= now) nextDaily.setDate(nextDaily.getDate() + 1);
  const msUntilDaily = nextDaily.getTime() - now.getTime();
  setTimeout(async () => {
    await initEliaCache();
    setInterval(initEliaCache, 24 * 60 * 60 * 1000);
  }, msUntilDaily);

  setInterval(() => void refreshNearRealtime(), 60 * 60 * 1000);

  console.log(`Elia next daily refresh: ${format(nextDaily, 'HH:mm')} UTC`);
}

export function getImbalancePrice(ts: Date): number | null {
  return cache.get(round15MinMs(ts))?.imbalancePriceEurMwh ?? null;
}

export function getMfrrMarginalPrice(ts: Date): number | null {
  return cache.get(round15MinMs(ts))?.mfrrMarginalEurMwh ?? null;
}

export function getImbalancePriceRange(
  from: Date,
  to: Date
): Array<{ timestamp: string; imbalancePriceEurMwh: number }> {
  const results: Array<{ timestamp: string; imbalancePriceEurMwh: number }> =
    [];
  let cur = round15MinMs(from);
  const toMs = to.getTime();
  while (cur <= toMs) {
    const point = cache.get(cur);
    if (point) {
      results.push({
        timestamp: new Date(cur).toISOString(),
        imbalancePriceEurMwh: point.imbalancePriceEurMwh,
      });
    }
    cur += 15 * 60 * 1000;
  }
  return results;
}
