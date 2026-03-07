import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth } from 'date-fns';
import type { UserEconomicsBlock, TimeWindow } from '@/types';

interface UserValueChartProps {
  blocks: UserEconomicsBlock[];
  timeWindow: TimeWindow;
}

export function UserValueChart({ blocks, timeWindow }: UserValueChartProps) {
  const data = useMemo(() => {
    if (timeWindow === '1D') {
      const map = new Map<
        string,
        { label: string; user: number; gridio: number; mfrr: number }
      >();
      blocks.forEach((b) => {
        const label = format(b.timestamp, 'HH:mm');
        const existing = map.get(label) ?? {
          label,
          user: 0,
          gridio: 0,
          mfrr: 0,
        };
        existing.user += b.userCreditEur;
        existing.gridio += b.gridioRetainedEur;
        existing.mfrr += b.mfrrBonusEur;
        map.set(label, existing);
      });
      return Array.from(map.values()).filter((_, i) => i % 4 === 0);
    }

    const map = new Map<
      string,
      { label: string; user: number; gridio: number; mfrr: number }
    >();
    blocks.forEach((b) => {
      const label =
        timeWindow === '1Y'
          ? format(startOfMonth(b.timestamp), 'MMM yy')
          : format(b.timestamp, 'dd MMM');
      const existing = map.get(label) ?? { label, user: 0, gridio: 0, mfrr: 0 };
      existing.user += b.userCreditEur;
      existing.gridio += b.gridioRetainedEur;
      existing.mfrr += b.mfrrBonusEur;
      map.set(label, existing);
    });
    return Array.from(map.values());
  }, [blocks, timeWindow]);

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
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `€${v.toFixed(0)}`}
            width={44}
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
            formatter={(v: number | undefined) =>
              v !== undefined ? `€${v.toFixed(2)}` : ''
            }
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar
            dataKey="user"
            name="User credit"
            stackId="a"
            fill="#00c9a7"
            fillOpacity={0.85}
          />
          <Bar
            dataKey="mfrr"
            name="mFRR bonus"
            stackId="a"
            fill="#818cf8"
            fillOpacity={0.85}
          />
          <Bar
            dataKey="gridio"
            name="Gridio retained"
            stackId="a"
            fill="#334155"
            fillOpacity={0.9}
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
