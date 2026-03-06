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
import type { SimulationResult } from '@/types';

const TEAL = '#00c9a7';
const DARK_GREY = '#334155';
const AMBER = '#f59e0b';
const TEAL_DIM = '#00c9a740';

interface SimulationChartProps {
  result: SimulationResult;
}

export function SimulationChart({ result }: SimulationChartProps) {
  const data = result.baseline.map((block, i) => ({
    label: format(block.timestamp, 'HH:mm'),
    baselineFlexible: Math.round(block.flexibleKwh),
    baselineNonFlexible: Math.round(block.nonFlexibleKwh),
    projectedFlexible: Math.round(result.projected[i]?.flexibleKwh ?? 0),
    projectedNonFlexible: Math.round(result.projected[i]?.nonFlexibleKwh ?? 0),
    priceEurMwh:
      Math.round((result.projected[i]?.priceEurMwh ?? block.priceEurMwh) * 10) /
      10,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Simulation Result</h3>
        <p className="text-xs text-muted-foreground">
          Projected load shift under the new price curve
        </p>
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
              interval={7}
            />
            <YAxis
              yAxisId="kwh"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={72}
              tickFormatter={(v: number) => `${v} kWh`}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `€${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222 47% 10%)',
                border: '1px solid hsl(222 47% 18%)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar
              yAxisId="kwh"
              dataKey="baselineFlexible"
              name="Baseline flexible"
              stackId="baseline"
              fill={DARK_GREY}
              maxBarSize={12}
            />
            <Bar
              yAxisId="kwh"
              dataKey="baselineNonFlexible"
              name="Baseline non-flex"
              stackId="baseline"
              fill="#1e293b"
              radius={[2, 2, 0, 0]}
              maxBarSize={12}
            />
            <Bar
              yAxisId="kwh"
              dataKey="projectedFlexible"
              name="Projected flexible"
              stackId="projected"
              fill={TEAL}
              maxBarSize={12}
            />
            <Bar
              yAxisId="kwh"
              dataKey="projectedNonFlexible"
              name="Projected non-flex"
              stackId="projected"
              fill={TEAL_DIM}
              radius={[2, 2, 0, 0]}
              maxBarSize={12}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="priceEurMwh"
              name="New price (€/MWh)"
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
