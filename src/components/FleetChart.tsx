import { useState, useMemo } from 'react';
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
} from 'recharts';
import { format } from 'date-fns';
import { generateHistoricLoad, generateForecastLoad } from '@/data/generators';
import type { TimeWindow, TimeBlock } from '@/types';

const WINDOWS: TimeWindow[] = ['1D', '1W', '1M', '1Y'];

interface ChartDataPoint {
  label: string;
  flexibleKwh: number;
  nonFlexibleKwh: number;
  priceEurMwh: number;
}

function aggregateBlocks(
  blocks: TimeBlock[],
  timeWindow: TimeWindow
): ChartDataPoint[] {
  if (timeWindow === '1D') {
    return blocks.map((b) => ({
      label: format(b.timestamp, 'HH:mm'),
      flexibleKwh: Math.round(b.flexibleKwh),
      nonFlexibleKwh: Math.round(b.nonFlexibleKwh),
      priceEurMwh: Math.round(b.priceEurMwh * 10) / 10,
    }));
  }

  if (timeWindow === '1W') {
    const buckets = new Map<
      string,
      { flex: number; nonFlex: number; prices: number[] }
    >();
    blocks.forEach((b) => {
      const bucketStart = new Date(b.timestamp);
      bucketStart.setMinutes(0, 0, 0);
      const hour = bucketStart.getHours();
      const bucketHour = Math.floor(hour / 6) * 6;
      bucketStart.setHours(bucketHour);
      const key = bucketStart.toISOString();
      const existing = buckets.get(key) ?? { flex: 0, nonFlex: 0, prices: [] };
      existing.flex += b.flexibleKwh;
      existing.nonFlex += b.nonFlexibleKwh;
      existing.prices.push(b.priceEurMwh);
      buckets.set(key, existing);
    });
    return Array.from(buckets.entries()).map(([key, val]) => ({
      label: format(new Date(key), 'EEE HH:mm'),
      flexibleKwh: Math.round(val.flex),
      nonFlexibleKwh: Math.round(val.nonFlex),
      priceEurMwh:
        Math.round(
          (val.prices.reduce((a, b) => a + b, 0) / val.prices.length) * 10
        ) / 10,
    }));
  }

  if (timeWindow === '1M') {
    const buckets = new Map<
      string,
      { flex: number; nonFlex: number; prices: number[] }
    >();
    blocks.forEach((b) => {
      const key = format(b.timestamp, 'yyyy-MM-dd');
      const existing = buckets.get(key) ?? { flex: 0, nonFlex: 0, prices: [] };
      existing.flex += b.flexibleKwh;
      existing.nonFlex += b.nonFlexibleKwh;
      existing.prices.push(b.priceEurMwh);
      buckets.set(key, existing);
    });
    return Array.from(buckets.entries()).map(([key, val]) => ({
      label: format(new Date(key), 'd MMM'),
      flexibleKwh: Math.round(val.flex),
      nonFlexibleKwh: Math.round(val.nonFlex),
      priceEurMwh:
        Math.round(
          (val.prices.reduce((a, b) => a + b, 0) / val.prices.length) * 10
        ) / 10,
    }));
  }

  // 1Y — monthly aggregates
  const buckets = new Map<
    string,
    { flex: number; nonFlex: number; prices: number[] }
  >();
  blocks.forEach((b) => {
    const key = format(b.timestamp, 'yyyy-MM');
    const existing = buckets.get(key) ?? { flex: 0, nonFlex: 0, prices: [] };
    existing.flex += b.flexibleKwh;
    existing.nonFlex += b.nonFlexibleKwh;
    existing.prices.push(b.priceEurMwh);
    buckets.set(key, existing);
  });
  return Array.from(buckets.entries()).map(([key, val]) => ({
    label: format(new Date(key + '-01'), 'MMM yyyy'),
    flexibleKwh: Math.round(val.flex),
    nonFlexibleKwh: Math.round(val.nonFlex),
    priceEurMwh:
      Math.round(
        (val.prices.reduce((a, b) => a + b, 0) / val.prices.length) * 10
      ) / 10,
  }));
}

const TEAL = '#00c9a7';
const AMBER = '#f59e0b';
const DARK_GREY = '#334155';

export function FleetChart() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1D');

  const data = useMemo(() => {
    const daysBack =
      timeWindow === '1D'
        ? 1
        : timeWindow === '1W'
          ? 7
          : timeWindow === '1M'
            ? 30
            : 365;
    const daysAhead =
      timeWindow === '1D'
        ? 1
        : timeWindow === '1W'
          ? 2
          : timeWindow === '1M'
            ? 5
            : 30;
    const historic = generateHistoricLoad(daysBack);
    const forecast = generateForecastLoad(daysAhead);
    return aggregateBlocks([...historic, ...forecast], timeWindow);
  }, [timeWindow]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Fleet Load & Price</h2>
          <p className="text-xs text-muted-foreground">
            Historic + forecast charging behaviour
          </p>
        </div>
        <div className="flex gap-1 bg-muted rounded-md p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeWindow === w
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
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
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            <Bar
              yAxisId="kwh"
              dataKey="flexibleKwh"
              name="Flexible"
              stackId="load"
              fill={TEAL}
              radius={[0, 0, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              yAxisId="kwh"
              dataKey="nonFlexibleKwh"
              name="Non-flexible"
              stackId="load"
              fill={DARK_GREY}
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="priceEurMwh"
              name="Price (€/MWh)"
              stroke={AMBER}
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
