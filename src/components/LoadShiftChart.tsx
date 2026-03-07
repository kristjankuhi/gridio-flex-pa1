import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import type { LoadShiftBlock, TimeWindow } from '@/types';

const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const SLATE = '#475569';

interface BucketedPoint {
  label: string;
  deltaKwh: number;
  daSpotEurMwh: number;
  avgDayPrice: number;
  isGoodShift: boolean;
}

function bucketBlocks(
  blocks: LoadShiftBlock[],
  timeWindow: TimeWindow
): BucketedPoint[] {
  if (blocks.length === 0) return [];

  const avgDayPrice =
    blocks.reduce((s, b) => s + Math.max(0, b.daSpotEurMwh), 0) /
    Math.max(1, blocks.length);

  if (timeWindow === '1D') {
    return blocks.map((b) => {
      const deltaKwh = Math.round(b.deltaKwh);
      const isGoodShift =
        (deltaKwh < 0 && b.daSpotEurMwh >= avgDayPrice) ||
        (deltaKwh > 0 && b.daSpotEurMwh < avgDayPrice);
      return {
        label: format(b.timestamp, 'HH:mm'),
        deltaKwh,
        daSpotEurMwh: b.daSpotEurMwh,
        avgDayPrice,
        isGoodShift,
      };
    });
  }

  const buckets = new Map<
    string,
    { delta: number; prices: number[]; label: string }
  >();

  const getKey = (b: LoadShiftBlock): { key: string; label: string } => {
    if (timeWindow === '1W') {
      const d = new Date(b.timestamp);
      d.setMinutes(0, 0, 0);
      d.setHours(Math.floor(d.getHours() / 6) * 6);
      return { key: d.toISOString(), label: format(d, 'EEE HH:mm') };
    }
    if (timeWindow === '1M') {
      return {
        key: format(b.timestamp, 'yyyy-MM-dd'),
        label: format(b.timestamp, 'd MMM'),
      };
    }
    // 1Y — weekly
    const d = new Date(b.timestamp);
    const dayOfWeek = d.getDay();
    d.setDate(d.getDate() - dayOfWeek);
    d.setHours(0, 0, 0, 0);
    return { key: d.toISOString(), label: format(d, 'd MMM') };
  };

  blocks.forEach((b) => {
    const { key, label } = getKey(b);
    const existing = buckets.get(key) ?? { delta: 0, prices: [], label };
    existing.delta += b.deltaKwh;
    existing.prices.push(b.daSpotEurMwh);
    buckets.set(key, existing);
  });

  return Array.from(buckets.values()).map(({ delta, prices, label }) => {
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deltaKwh = Math.round(delta);
    const isGoodShift =
      (deltaKwh < 0 && avgPrice >= avgDayPrice) ||
      (deltaKwh > 0 && avgPrice < avgDayPrice);
    return {
      label,
      deltaKwh,
      daSpotEurMwh: Math.round(avgPrice * 10) / 10,
      avgDayPrice,
      isGoodShift,
    };
  });
}

interface LoadShiftChartProps {
  blocks: LoadShiftBlock[];
  timeWindow: TimeWindow;
}

export function LoadShiftChart({ blocks, timeWindow }: LoadShiftChartProps) {
  const data = useMemo(
    () => bucketBlocks(blocks, timeWindow),
    [blocks, timeWindow]
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No shift data for this period.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">DA Load Shift</h2>
        <p className="text-xs text-muted-foreground">
          How much load was moved vs the uncontrolled baseline, and whether the
          shift happened at a cheap or expensive hour
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: EMERALD, opacity: 0.85 }}
          />
          Shifted to cheaper hour (saves cost)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: AMBER, opacity: 0.85 }}
          />
          Shifted to more expensive hour (adds cost)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-8 h-px"
            style={{ backgroundColor: AMBER }}
          />
          DA price (€/MWh)
        </span>
      </div>
      <div className="h-64 w-full">
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
              yAxisId="delta"
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
              formatter={(
                value: number | undefined,
                name: string | undefined
              ) => {
                if (value === undefined) return ['—', name ?? ''];
                if (name === 'Shift (kWh)') return [`${value} kWh`, name];
                return [`€${value}`, name ?? ''];
              }}
            />
            <ReferenceLine
              yAxisId="delta"
              y={0}
              stroke={SLATE}
              strokeWidth={1}
            />
            <Bar
              yAxisId="delta"
              dataKey="deltaKwh"
              name="Shift (kWh)"
              maxBarSize={24}
              radius={[2, 2, 0, 0]}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.deltaKwh === 0
                      ? SLATE
                      : entry.isGoodShift
                        ? EMERALD
                        : AMBER
                  }
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="daSpotEurMwh"
              name="DA price (€/MWh)"
              stroke={AMBER}
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
