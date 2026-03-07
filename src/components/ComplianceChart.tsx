import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { DepartureComplianceBlock } from '@/types';

interface ComplianceChartProps {
  blocks: DepartureComplianceBlock[];
}

export function ComplianceChart({ blocks }: ComplianceChartProps) {
  const data = useMemo(
    () =>
      blocks.map((b) => ({
        label: format(b.date, 'dd MMM'),
        commuter: Math.round(b.commuterCompliancePct * 10) / 10,
        flexible: Math.round(b.flexibleCompliancePct * 10) / 10,
      })),
    [blocks]
  );

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
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
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[85, 100]}
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
            formatter={(v: number) => `${v}%`}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Line
            type="monotone"
            dataKey="commuter"
            name="Commuter"
            stroke="#00c9a7"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="flexible"
            name="Flexible"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
