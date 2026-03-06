import { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format, endOfDay, addDays } from 'date-fns';
import { generateHistoricLoad, generateForecastLoad } from '@/data/generators';
import type { TimeWindow, PeriodRange } from '@/types';

const TEAL = '#00c9a7';
const AMBER = '#f59e0b';
const DARK_GREY = '#334155';
const CAPACITY_KW = 3280;

// DA market closes at 12:00 CET, prices published ~12:45 for the next full day.
// After 13:00, prices through end of tomorrow are known; before 13:00, only today.
function getDAKnownHorizon(): Date {
  const now = new Date();
  return now.getHours() >= 13 ? endOfDay(addDays(now, 1)) : endOfDay(now);
}

interface ChartDataPoint {
  label: string;
  flexibleKwh: number;
  nonFlexibleKwh: number;
  priceHistoric: number | null;
  priceForecast: number | null;
  isForecast: boolean;
}

function aggregateBlocks(
  historicBlocks: ReturnType<typeof generateHistoricLoad>,
  forecastBlocks: ReturnType<typeof generateForecastLoad>,
  timeWindow: TimeWindow,
  daHorizon: Date
): ChartDataPoint[] {
  type RawBlock = {
    timestamp: Date;
    flexibleKwh: number;
    nonFlexibleKwh: number;
    priceEurMwh: number;
    isForecast: boolean;
  };
  const all: RawBlock[] = [
    ...historicBlocks.map((b) => ({ ...b, isForecast: false })),
    ...forecastBlocks.map((b) => ({ ...b, isForecast: true })),
  ];

  if (timeWindow === '1D') {
    return all.map((b) => {
      const isPriceForecast = b.timestamp > daHorizon;
      return {
        label: format(b.timestamp, 'HH:mm'),
        flexibleKwh: Math.round(b.flexibleKwh),
        nonFlexibleKwh: Math.round(b.nonFlexibleKwh),
        priceHistoric: isPriceForecast
          ? null
          : Math.round(b.priceEurMwh * 10) / 10,
        priceForecast: isPriceForecast
          ? Math.round(b.priceEurMwh * 10) / 10
          : null,
        isForecast: b.isForecast,
      };
    });
  }

  const buckets = new Map<
    string,
    { flex: number; nonFlex: number; prices: number[]; isForecast: boolean }
  >();

  const getBucketKey = (b: RawBlock): string => {
    if (timeWindow === '1W') {
      const s = new Date(b.timestamp);
      s.setMinutes(0, 0, 0);
      s.setHours(Math.floor(s.getHours() / 6) * 6);
      return s.toISOString();
    }
    if (timeWindow === '1M') return format(b.timestamp, 'yyyy-MM-dd');
    return format(b.timestamp, 'yyyy-MM');
  };

  all.forEach((b) => {
    const key = getBucketKey(b);
    const existing = buckets.get(key) ?? {
      flex: 0,
      nonFlex: 0,
      prices: [],
      isForecast: b.isForecast,
    };
    existing.flex += b.flexibleKwh;
    existing.nonFlex += b.nonFlexibleKwh;
    existing.prices.push(b.priceEurMwh);
    if (b.isForecast) existing.isForecast = true;
    buckets.set(key, existing);
  });

  return Array.from(buckets.entries()).map(([key, val]) => {
    const avgPrice = val.prices.reduce((a, b) => a + b, 0) / val.prices.length;
    const bucketDate = new Date(timeWindow === '1Y' ? key + '-01' : key);
    const isPriceForecast = bucketDate > daHorizon;
    const label =
      timeWindow === '1W'
        ? format(new Date(key), 'EEE HH:mm')
        : timeWindow === '1M'
          ? format(new Date(key), 'd MMM')
          : format(new Date(key + '-01'), 'MMM yyyy');
    return {
      label,
      flexibleKwh: Math.round(val.flex),
      nonFlexibleKwh: Math.round(val.nonFlex),
      priceHistoric: isPriceForecast ? null : Math.round(avgPrice * 10) / 10,
      priceForecast: isPriceForecast ? Math.round(avgPrice * 10) / 10 : null,
      isForecast: val.isForecast,
    };
  });
}

function getNowLabel(timeWindow: TimeWindow): string {
  const now = new Date();
  if (timeWindow === '1D') {
    const rounded = new Date(now);
    rounded.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
    return format(rounded, 'HH:mm');
  }
  if (timeWindow === '1W') {
    const s = new Date(now);
    s.setMinutes(0, 0, 0);
    s.setHours(Math.floor(s.getHours() / 6) * 6);
    return format(s, 'EEE HH:mm');
  }
  if (timeWindow === '1M') return format(now, 'd MMM');
  return format(now, 'MMM yyyy');
}

interface FleetChartProps {
  range: PeriodRange;
  timeWindow: TimeWindow;
}

export function FleetChart({ range, timeWindow }: FleetChartProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  void tick; // trigger re-render to refresh "now" position

  const data = useMemo(() => {
    const daysBack = Math.max(
      1,
      Math.ceil((now.getTime() - range.start.getTime()) / 86400000) + 1
    );
    // daysAhead covers from now to range.end — can be up to ~365 for far-future periods
    const daysAhead = Math.max(
      1,
      Math.ceil((range.end.getTime() - now.getTime()) / 86400000) + 1
    );

    const historic = generateHistoricLoad(daysBack).filter(
      (b) => b.timestamp >= range.start && b.timestamp <= range.end
    );
    const forecast = generateForecastLoad(daysAhead).filter(
      (b) => b.timestamp >= range.start && b.timestamp <= range.end
    );

    return aggregateBlocks(historic, forecast, timeWindow, getDAKnownHorizon());
  }, [range, timeWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  const nowLabel = getNowLabel(timeWindow);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Fleet Load & Price</h2>
        <p className="text-xs text-muted-foreground">
          Historic + forecast charging behaviour
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 48, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(222 47% 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="kwh"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v} kWh`}
              width={72}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `€${v}`}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222 47% 10%)',
                border: '1px solid hsl(222 47% 18%)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />

            {/* Capacity ceiling */}
            <ReferenceLine
              yAxisId="kwh"
              y={CAPACITY_KW}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{
                value: 'Opted-in capacity',
                fill: '#475569',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            {/* Now marker */}
            <ReferenceLine
              x={nowLabel}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="3 3"
              label={{
                value: 'Now',
                fill: 'rgba(255,255,255,0.35)',
                fontSize: 10,
                position: 'top',
              }}
            />

            <Bar
              yAxisId="kwh"
              dataKey="flexibleKwh"
              name="Opted-in flexible"
              stackId="load"
              radius={[0, 0, 0, 0]}
              maxBarSize={24}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={TEAL}
                  fillOpacity={entry.isForecast ? 0.4 : 1}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="kwh"
              dataKey="nonFlexibleKwh"
              name="Non-opted-in"
              stackId="load"
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={DARK_GREY}
                  fillOpacity={entry.isForecast ? 0.4 : 1}
                />
              ))}
            </Bar>

            <Line
              yAxisId="price"
              type="monotone"
              dataKey="priceHistoric"
              name="Price (€/MWh)"
              stroke={AMBER}
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="priceForecast"
              name="Forecast price"
              stroke={AMBER}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
