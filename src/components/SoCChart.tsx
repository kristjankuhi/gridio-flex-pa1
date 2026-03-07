import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import type { SoCBlock } from '@/types';

interface SoCChartProps {
  blocks: SoCBlock[];
}

export function SoCChart({ blocks }: SoCChartProps) {
  const data = useMemo(
    () =>
      blocks.map((b) => ({
        label: format(b.timestamp, 'HH:mm'),
        avgSoCPct: Math.round(b.avgSoCPct * 10) / 10,
        pluggedInCount: b.pluggedInCount,
        upHeadroomMwh: Math.round((b.upHeadroomKwh / 1000) * 100) / 100,
        downHeadroomMwh: Math.round((b.downHeadroomKwh / 1000) * 100) / 100,
        dynamicFloorPct: b.dynamicFloorPct, // NEW
      })),
    [blocks]
  );

  const minBuffer = useMemo(() => {
    const month = new Date().getMonth();
    if (month >= 10 || month <= 1) return 25;
    if ((month >= 2 && month <= 3) || (month >= 8 && month <= 9)) return 22;
    return 20;
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">
          Fleet SoC & Flexibility Headroom
        </h2>
        <p className="text-xs text-muted-foreground">
          Average state of charge and available up/down flexibility through the
          day
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 56, bottom: 0, left: 8 }}
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
              yAxisId="soc"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
            />
            <YAxis
              yAxisId="kwh"
              orientation="right"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)} MWh`}
              width={60}
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
            <ReferenceLine
              yAxisId="soc"
              y={minBuffer}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: `Min buffer (${minBuffer}%)`,
                fill: '#ef4444',
                fontSize: 9,
                position: 'insideBottomLeft',
              }}
            />
            <ReferenceLine
              yAxisId="soc"
              y={95}
              stroke="#475569"
              strokeDasharray="3 3"
              label={{
                value: 'Max (95%)',
                fill: '#475569',
                fontSize: 9,
                position: 'insideTopLeft',
              }}
            />
            <Area
              yAxisId="kwh"
              type="monotone"
              dataKey="upHeadroomMwh"
              name="Up headroom (MWh)"
              fill="#00c9a7"
              fillOpacity={0.15}
              stroke="#00c9a7"
              strokeWidth={1}
              dot={false}
            />
            <Area
              yAxisId="kwh"
              type="monotone"
              dataKey="downHeadroomMwh"
              name="Down headroom (MWh)"
              fill="#f59e0b"
              fillOpacity={0.15}
              stroke="#f59e0b"
              strokeWidth={1}
              dot={false}
            />
            <Line
              yAxisId="soc"
              type="monotone"
              dataKey="avgSoCPct"
              name="Avg SoC (%)"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="soc"
              type="monotone"
              dataKey="dynamicFloorPct"
              name="Departure floor"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
