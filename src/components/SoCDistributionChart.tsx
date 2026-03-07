import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SoCBlock } from '@/types';

interface SoCDistributionChartProps {
  blocks: SoCBlock[];
}

const BUCKETS = [
  { label: '0–20%', min: 0, max: 20 },
  { label: '20–40%', min: 20, max: 40 },
  { label: '40–60%', min: 40, max: 60 },
  { label: '60–80%', min: 60, max: 80 },
  { label: '80–95%', min: 80, max: 95 },
  { label: '>95%', min: 95, max: 101 },
];

export function SoCDistributionChart({ blocks }: SoCDistributionChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const currentBlock =
      blocks.find((b) => b.timestamp >= now) ?? blocks[blocks.length - 1];
    if (!currentBlock) return [];

    const avg = currentBlock.avgSoCPct;
    const spread = 20;

    return BUCKETS.map(({ label, min, max }) => {
      const centerDist = Math.max(
        0,
        1 - Math.abs((min + max) / 2 - avg) / spread
      );
      const consumer = Math.round(
        currentBlock.pluggedInCount * 0.7 * centerDist * 0.4
      );
      const fleet = Math.round(
        currentBlock.pluggedInCount * 0.3 * centerDist * 0.4
      );
      return { label, consumer, fleet };
    });
  }, [blocks]);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
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
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={36}
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
          <Bar
            dataKey="consumer"
            name="Consumer EVs"
            stackId="a"
            fill="#00c9a7"
            fillOpacity={0.8}
          />
          <Bar
            dataKey="fleet"
            name="Fleet vehicles"
            stackId="a"
            fill="#334155"
            fillOpacity={0.9}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
