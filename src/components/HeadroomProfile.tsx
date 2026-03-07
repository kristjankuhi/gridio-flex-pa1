import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SoCBlock } from '@/types';

interface HeadroomProfileProps {
  blocks: SoCBlock[];
}

export function HeadroomProfile({ blocks }: HeadroomProfileProps) {
  const data = useMemo(() => {
    const buckets = new Map<
      string,
      { upSum: number; downSum: number; floorSum: number; count: number }
    >();

    blocks.forEach((b) => {
      const h = b.timestamp.getHours().toString().padStart(2, '0');
      const m = b.timestamp.getMinutes().toString().padStart(2, '0');
      const label = `${h}:${m}`;
      const existing = buckets.get(label) ?? {
        upSum: 0,
        downSum: 0,
        floorSum: 0,
        count: 0,
      };
      existing.upSum += b.upHeadroomKwh / 1000;
      existing.downSum += b.downHeadroomKwh / 1000;
      existing.floorSum += b.dynamicFloorPct;
      existing.count++;
      buckets.set(label, existing);
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .filter((_, i) => i % 4 === 0)
      .map(([label, v]) => ({
        label,
        upMwh: Math.round((v.upSum / v.count) * 100) / 100,
        downMwh: Math.round((v.downSum / v.count) * 100) / 100,
        floor: Math.round(v.floorSum / v.count),
      }));
  }, [blocks]);

  return (
    <div className="h-56 w-full">
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
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="mwh"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)} MWh`}
            width={52}
          />
          <YAxis
            yAxisId="soc"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(222 47% 10%)',
              border: '1px solid hsl(222 47% 18%)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Area
            yAxisId="mwh"
            type="monotone"
            dataKey="upMwh"
            name="Up headroom (MWh)"
            fill="#00c9a7"
            fillOpacity={0.2}
            stroke="#00c9a7"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            yAxisId="mwh"
            type="monotone"
            dataKey="downMwh"
            name="Down headroom (MWh)"
            fill="#f59e0b"
            fillOpacity={0.2}
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            yAxisId="soc"
            type="monotone"
            dataKey="floor"
            name="Departure floor"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
